"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../../lib/firebase";
import Link from "next/link";

export default function Financeiro() {
  const dataAtual = new Date();
  const mesAtualPadrao = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}`;
  const anoAtualPadrao = dataAtual.getFullYear().toString();

  const [mesFiltro, setMesFiltro] = useState(mesAtualPadrao);
  const [anoResumo, setAnoResumo] = useState(anoAtualPadrao);
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Estados do Formulário
  const [tipo, setTipo] = useState<"RECEITA" | "DESPESA">("DESPESA");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoriaDespesa, setCategoriaDespesa] = useState<"ESSENCIAL" | "NAO_ESSENCIAL">("ESSENCIAL");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]); 
  
  const [formaPagamento, setFormaPagamento] = useState<"PIX" | "CARTAO">("PIX");
  const [modoCartao, setModoCartao] = useState<"PARCELADO" | "RECORRENTE">("PARCELADO");
  const [parcelas, setParcelas] = useState(1);
  const [pago, setPago] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "transacoes"), orderBy("data", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const transacoesDB: any[] = [];
      querySnapshot.forEach((doc) => { transacoesDB.push({ id: doc.id, ...doc.data() }); });
      setTransacoes(transacoesDB);
      setCarregando(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao || !valor || !data || parcelas < 1) return;

    try {
      let [anoBase, mesBase, diaBase] = data.split('-').map(Number);

      // REGRA DO CORTE DO CARTÃO (Dia 25)
      if (formaPagamento === "CARTAO" && diaBase > 25) {
        mesBase += 1;
        if (mesBase > 12) { mesBase -= 12; anoBase += 1; }
      }

      let valorPorLancamento = parseFloat(valor);
      if (formaPagamento === "CARTAO" && modoCartao === "PARCELADO") {
        valorPorLancamento = parseFloat(valor) / parcelas;
      }
      
      const grupoId = parcelas > 1 ? `grupo_${Date.now()}` : null;
      const batch = writeBatch(db);

      for (let i = 0; i < parcelas; i++) {
        let mesAdd = mesBase + i;
        let anoAdd = anoBase;
        while (mesAdd > 12) { mesAdd -= 12; anoAdd += 1; }

        let diaFinal = diaBase;
        if (mesAdd === 2 && diaFinal > 28) diaFinal = 28;
        if ([4, 6, 9, 11].includes(mesAdd) && diaFinal > 30) diaFinal = 30;

        const strDataFormatada = `${anoAdd}-${String(mesAdd).padStart(2, '0')}-${String(diaFinal).padStart(2, '0')}`;
        const strMesAnoFormatado = `${anoAdd}-${String(mesAdd).padStart(2, '0')}`;
        
        const descFinal = parcelas > 1 ? `${descricao} (${i + 1}/${parcelas})` : descricao;
        const statusPago = i === 0 && formaPagamento === "PIX" ? pago : false;

        const novaTransacaoRef = doc(collection(db, "transacoes"));
        batch.set(novaTransacaoRef, {
          tipo, descricao: descFinal, valor: valorPorLancamento,
          categoriaDespesa: tipo === "DESPESA" ? categoriaDespesa : null,
          formaPagamento, data: strDataFormatada, mesAno: strMesAnoFormatado,
          pago: statusPago, grupoId, criadoEm: new Date()
        });
      }

      await batch.commit();
      setDescricao(""); setValor(""); setPago(false); setParcelas(1); setFormaPagamento("PIX"); setModoCartao("PARCELADO");
    } catch (error) { console.error("Erro", error); alert("Erro ao registrar."); }
  };

  const alternarStatusPago = async (id: string, statusAtual: boolean) => {
    try { await updateDoc(doc(db, "transacoes", id), { pago: !statusAtual }); } catch (error) { console.error(error); }
  };

  const excluirTransacao = async (transacaoInfo: any) => {
    if (!window.confirm(`Deseja excluir o registro "${transacaoInfo.descricao}"?`)) return; 

    if (transacaoInfo.grupoId) {
      if (window.confirm("Esta transação faz parte de um lote.\n\n• [OK] Exclui ESTA e as FUTURAS\n• [CANCELAR] Exclui APENAS ESTA")) {
        const trsNoGrupo = transacoes.filter(t => t.grupoId === transacaoInfo.grupoId && t.data >= transacaoInfo.data);
        const batch = writeBatch(db);
        trsNoGrupo.forEach(t => batch.delete(doc(db, "transacoes", t.id)));
        await batch.commit();
        return; 
      }
    }
    await deleteDoc(doc(db, "transacoes", transacaoInfo.id));
  };

  // Cálculos Mês Atual
  const transacoesDoMes = transacoes.filter(t => t.mesAno === mesFiltro);
  const receitas = transacoesDoMes.filter(t => t.tipo === "RECEITA");
  const despesas = transacoesDoMes.filter(t => t.tipo === "DESPESA");

  const totalReceitas = receitas.reduce((acc, curr) => acc + curr.valor, 0);
  const totalReceitasRecebidas = receitas.filter(t => t.pago).reduce((acc, curr) => acc + curr.valor, 0);
  const totalEssenciais = despesas.filter(t => t.categoriaDespesa === "ESSENCIAL").reduce((acc, curr) => acc + curr.valor, 0);
  const totalNaoEssenciais = despesas.filter(t => t.categoriaDespesa === "NAO_ESSENCIAL").reduce((acc, curr) => acc + curr.valor, 0);
  const totalDespesas = totalEssenciais + totalNaoEssenciais;
  const totalDespesasPagas = despesas.filter(t => t.pago).reduce((acc, curr) => acc + curr.valor, 0);
  const faturaCartao = despesas.filter(t => t.formaPagamento === "CARTAO").reduce((acc, curr) => acc + curr.valor, 0);

  // Resumo Anual
  const mesesNomes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const anosDisponiveis = Array.from(new Set(transacoes.map(t => t.mesAno.substring(0, 4)))).sort((a, b) => b.localeCompare(a));
  if (!anosDisponiveis.includes(anoAtualPadrao)) anosDisponiveis.push(anoAtualPadrao);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 text-gray-800">
      <div className="max-w-7xl mx-auto">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <h1 className="text-3xl font-bold">Gestão Financeira</h1>
          <div className="flex items-center gap-4">
            <input type="month" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} className="p-2 border border-gray-300 rounded focus:ring-blue-500 bg-white shadow-sm" />
            <Link href="/" className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition text-sm font-medium">← Voltar ao Estoque</Link>
          </div>
        </div>

        {/* CARDS DE RESUMO DO MÊS */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-green-500">
            <h3 className="text-xs font-medium text-gray-500 uppercase">Receitas Totais</h3>
            <p className="text-xl font-bold text-green-600">R$ {totalReceitas.toFixed(2)}</p>
            <p className="text-[10px] text-gray-400 mt-1">Já recebido: R$ {totalReceitasRecebidas.toFixed(2)}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200 border-l-4 border-l-blue-500 relative overflow-hidden">
            <div className="absolute right-[-10px] top-[-10px] opacity-10 text-6xl">💳</div>
            <h3 className="text-xs font-medium text-blue-700 uppercase">Fatura Cartão</h3>
            <p className="text-xl font-bold text-blue-800">R$ {faturaCartao.toFixed(2)}</p>
            <p className="text-[10px] text-blue-600 mt-1">Cobranças deste mês</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-amber-500">
            <h3 className="text-xs font-medium text-gray-500 uppercase">Desp. Essenciais</h3>
            <p className="text-xl font-bold text-amber-600">R$ {totalEssenciais.toFixed(2)}</p>
            <p className="text-[10px] text-gray-400 mt-1">Custos fixos e operação</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-orange-500">
            <h3 className="text-xs font-medium text-gray-500 uppercase">Desp. Ñ Essenciais</h3>
            <p className="text-xl font-bold text-orange-600">R$ {totalNaoEssenciais.toFixed(2)}</p>
            <p className="text-[10px] text-gray-400 mt-1">Variáveis e extras</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700 text-white">
            <h3 className="text-xs font-medium text-gray-300 uppercase">Total Saídas</h3>
            <p className="text-xl font-bold">R$ {totalDespesas.toFixed(2)}</p>
            <p className="text-[10px] text-gray-300 mt-1">Já pago: <span className="text-red-300">R$ {totalDespesasPagas.toFixed(2)}</span></p>
          </div>
        </div>

        {/* FORMULÁRIO DE LANÇAMENTO */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold mb-4">Novo Lançamento Financeiro</h2>
          <form onSubmit={handleSalvar} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 bg-white">
                <option value="RECEITA">Receita</option>
                <option value="DESPESA">Despesa</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Conta de Luz, Venda Shopee" className="w-full p-2 border border-gray-300 rounded bg-white" />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formaPagamento === "CARTAO" && modoCartao === "PARCELADO" ? "Valor Total (R$)" : "Valor do Mês (R$)"}
              </label>
              <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0.00" className="w-full p-2 border border-gray-300 rounded bg-white" />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Transação</label>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-full p-2 border border-gray-300 rounded bg-white" />
            </div>
            {tipo === "DESPESA" ? (
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select value={categoriaDespesa} onChange={(e) => setCategoriaDespesa(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded bg-white">
                  <option value="ESSENCIAL">Essencial</option>
                  <option value="NAO_ESSENCIAL">Não Essencial</option>
                </select>
              </div>
            ) : <div className="md:col-span-1"></div>}
            
            <div className="md:col-span-2 border-t pt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pagamento</label>
              <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded font-semibold text-blue-800 bg-white">
                <option value="PIX">Pix / À Vista</option>
                <option value="CARTAO">Cartão de Crédito</option>
              </select>
            </div>

            {formaPagamento === "CARTAO" ? (
              <div className="md:col-span-2 border-t pt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Formato da Cobrança</label>
                <select value={modoCartao} onChange={(e) => setModoCartao(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded bg-white text-gray-700">
                  <option value="PARCELADO">Parcelado (Divide o valor total)</option>
                  <option value="RECORRENTE">Assinatura (Repete valor integral)</option>
                </select>
              </div>
            ) : <div className="md:col-span-2 border-t pt-3"></div>}

            <div className="md:col-span-2 border-t pt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formaPagamento === "CARTAO" && modoCartao === "PARCELADO" ? "Nº de Parcelas:" : "Repetir por quantos meses:"}
              </label>
              <div className="flex items-center">
                <input type="number" min="1" max="60" value={parcelas} onChange={(e) => setParcelas(parseInt(e.target.value) || 1)} className="w-20 p-2 border border-gray-300 rounded bg-white text-center" />
                <span className="ml-3 text-[10px] text-gray-500 leading-tight">
                  {formaPagamento === "CARTAO" && modoCartao === "PARCELADO" && parcelas > 1 
                    ? `Será ${parcelas}x de R$ ${(parseFloat(valor||"0")/parcelas).toFixed(2)}` 
                    : `Lançamentos idênticos`}
                </span>
              </div>
            </div>

            <div className="md:col-span-6 mt-2 flex justify-between items-center">
              {formaPagamento === "PIX" ? (
                <label className="flex items-center cursor-pointer">
                  <input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} className="mr-2 w-5 h-5 text-blue-600 rounded" />
                  <span className="text-sm font-medium">{tipo === "RECEITA" ? "Já Recebido 1º Mês?" : "Já Pago 1º Mês?"}</span>
                </label>
              ) : <div></div>}
              <button type="submit" className={`text-white px-8 py-2 rounded font-bold ${tipo === "RECEITA" ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                Lançar {tipo === "RECEITA" ? "Receita" : "Despesa"}
              </button>
            </div>
          </form>
        </div>

        {/* TABELAS LADO A LADO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-green-50 p-4 border-b border-green-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-green-800">Entradas (Receitas)</h2>
              <span className="text-sm font-medium text-green-600">{mesFiltro.split('-').reverse().join('/')}</span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 border-b text-xs font-semibold text-gray-600">Data</th>
                  <th className="p-3 border-b text-xs font-semibold text-gray-600">Descrição</th>
                  <th className="p-3 border-b text-xs font-semibold text-gray-600">Valor</th>
                  <th className="p-3 border-b text-xs font-semibold text-center text-gray-600">Status</th>
                  <th className="p-3 border-b"></th>
                </tr>
              </thead>
              <tbody>
                {receitas.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-500 text-sm">Nenhuma receita neste mês.</td></tr>}
                {receitas.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="p-3 border-b text-sm">{r.data.split('-').reverse().join('/')}</td>
                    <td className="p-3 border-b text-sm font-medium">
                      {r.descricao}
                      {r.formaPagamento === "CARTAO" && <span className="ml-1 text-[10px] px-1 bg-blue-100 text-blue-800 rounded">💳</span>}
                    </td>
                    <td className="p-3 border-b text-sm text-green-600 font-bold">R$ {r.valor.toFixed(2)}</td>
                    <td className="p-3 border-b text-center">
                      <button onClick={() => alternarStatusPago(r.id, r.pago)} className={`text-xs px-2 py-1 rounded-full font-semibold ${r.pago ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {r.pago ? "Recebido" : "Pendente"}
                      </button>
                    </td>
                    <td className="p-3 border-b text-right">
                      <button onClick={() => excluirTransacao(r)} className="text-red-500 hover:text-red-700 font-bold text-xs">X</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-red-800">Saídas (Despesas)</h2>
              <span className="text-sm font-medium text-red-600">{mesFiltro.split('-').reverse().join('/')}</span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 border-b text-xs font-semibold text-gray-600">Data</th>
                  <th className="p-3 border-b text-xs font-semibold text-gray-600">Descrição</th>
                  <th className="p-3 border-b text-xs font-semibold text-gray-600">Valor</th>
                  <th className="p-3 border-b text-xs font-semibold text-center text-gray-600">Status</th>
                  <th className="p-3 border-b"></th>
                </tr>
              </thead>
              <tbody>
                {despesas.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-500 text-sm">Nenhuma despesa neste mês.</td></tr>}
                {despesas.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="p-3 border-b text-sm">{d.data.split('-').reverse().join('/')}</td>
                    <td className="p-3 border-b text-sm">
                      <div className="font-medium">
                        {d.descricao}
                        {d.formaPagamento === "CARTAO" && <span className="ml-1 text-[10px] px-1 bg-blue-100 text-blue-800 rounded" title="Pago no Cartão">💳</span>}
                        {d.grupoId && d.formaPagamento !== "CARTAO" && <span className="ml-1 text-[10px] text-gray-400" title="Recorrente">🔄</span>}
                      </div>
                      <div className={`text-[10px] mt-0.5 px-1.5 py-0.5 inline-block rounded ${d.categoriaDespesa === "ESSENCIAL" ? "bg-amber-100 text-amber-800" : "bg-orange-100 text-orange-800"}`}>
                        {d.categoriaDespesa === "ESSENCIAL" ? "Essencial" : "Não Essencial"}
                      </div>
                    </td>
                    <td className="p-3 border-b text-sm text-red-600 font-bold">R$ {d.valor.toFixed(2)}</td>
                    <td className="p-3 border-b text-center">
                      <button onClick={() => alternarStatusPago(d.id, d.pago)} className={`text-xs px-2 py-1 rounded-full font-semibold ${d.pago ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {d.pago ? "Pago" : "Pendente"}
                      </button>
                    </td>
                    <td className="p-3 border-b text-right">
                      <button onClick={() => excluirTransacao(d)} className="text-red-500 hover:text-red-700 font-bold text-xs" title="Excluir">X</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- TABELA DE RESUMO MENSAL / ANUAL --- */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Resumo Mensal Consolidado (DRE)</h2>
            <select value={anoResumo} onChange={(e) => setAnoResumo(e.target.value)} className="p-1 rounded bg-gray-700 text-white border border-gray-600 focus:ring-gray-400">
              {anosDisponiveis.map(ano => <option key={ano} value={ano}>{ano}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 border-b font-semibold text-sm text-gray-600">Mês</th>
                  <th className="p-4 border-b font-semibold text-sm text-gray-600">Receitas</th>
                  <th className="p-4 border-b font-semibold text-sm text-gray-600">Desp. Essenciais</th>
                  <th className="p-4 border-b font-semibold text-sm text-gray-600">Desp. Não Essenciais</th>
                  <th className="p-4 border-b font-semibold text-sm text-gray-600">Total Despesas</th>
                  <th className="p-4 border-b font-semibold text-sm text-gray-600 bg-gray-100">Saldo Final</th>
                </tr>
              </thead>
              <tbody>
                {mesesNomes.map((nomeMes, index) => {
                  const targetMesAno = `${anoResumo}-${String(index + 1).padStart(2, '0')}`;
                  const transDoMesResumo = transacoes.filter(t => t.mesAno === targetMesAno);
                  
                  const rct = transDoMesResumo.filter(t => t.tipo === "RECEITA").reduce((acc, curr) => acc + curr.valor, 0);
                  const desEss = transDoMesResumo.filter(t => t.tipo === "DESPESA" && t.categoriaDespesa === "ESSENCIAL").reduce((acc, curr) => acc + curr.valor, 0);
                  const desNaoEss = transDoMesResumo.filter(t => t.tipo === "DESPESA" && t.categoriaDespesa === "NAO_ESSENCIAL").reduce((acc, curr) => acc + curr.valor, 0);
                  const desTot = desEss + desNaoEss;
                  const saldo = rct - desTot;

                  return (
                    <tr key={nomeMes} className="hover:bg-gray-50 border-b last:border-0">
                      <td className="p-4 text-sm font-medium text-gray-700">{nomeMes}</td>
                      <td className="p-4 text-sm text-green-600 font-medium">R$ {rct.toFixed(2)}</td>
                      <td className="p-4 text-sm text-amber-600">R$ {desEss.toFixed(2)}</td>
                      <td className="p-4 text-sm text-orange-600">R$ {desNaoEss.toFixed(2)}</td>
                      <td className="p-4 text-sm text-red-600 font-medium">R$ {desTot.toFixed(2)}</td>
                      <td className={`p-4 text-sm font-bold bg-gray-50 ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>R$ {saldo.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}