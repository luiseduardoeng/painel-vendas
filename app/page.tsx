"use client";
import React, { useState, useEffect, Fragment } from "react";
import { collection, addDoc, getDocs, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import Link from "next/link";

type ModoFormulario = "CRIAR" | "EDITAR" | "REPOR";

export default function Home() {
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [precoCompra, setPrecoCompra] = useState("");
  const [localCompra, setLocalCompra] = useState(""); 
  const [estoque, setEstoque] = useState("");

  const [formaPagamento, setFormaPagamento] = useState<"PIX" | "CARTAO">("PIX");
  const [parcelas, setParcelas] = useState(1);
  const [dataCompra, setDataCompra] = useState(new Date().toISOString().split("T")[0]);

  const [itens, setItens] = useState<any[]>([]);
  const [categoriasDB, setCategoriasDB] = useState<any[]>([]);
  const [locaisDB, setLocaisDB] = useState<any[]>([]); 
  const [canaisDB, setCanaisDB] = useState<any[]>([]); 
  
  const [carregando, setCarregando] = useState(true);
  const [modo, setModo] = useState<ModoFormulario>("CRIAR");
  const [itemAtivo, setItemAtivo] = useState<any>(null);
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const qProd = query(collection(db, "produtos"), orderBy("criadoEm", "desc"));
    const unsubProd = onSnapshot(qProd, (querySnapshot) => {
      const produtosFirestore: any[] = [];
      querySnapshot.forEach((doc) => produtosFirestore.push({ id: doc.id, ...doc.data() }));
      setItens(produtosFirestore);
      setCarregando(false);
    });
    const qCat = query(collection(db, "categorias"), orderBy("nome", "asc"));
    const unsubCat = onSnapshot(qCat, (querySnapshot) => {
      const catArray: any[] = [];
      querySnapshot.forEach((doc) => catArray.push({ id: doc.id, ...doc.data() }));
      setCategoriasDB(catArray);
    });
    const qLocais = query(collection(db, "locais"), orderBy("nome", "asc"));
    const unsubLocais = onSnapshot(qLocais, (querySnapshot) => {
      const locaisArray: any[] = [];
      querySnapshot.forEach((doc) => locaisArray.push({ id: doc.id, ...doc.data() }));
      setLocaisDB(locaisArray);
    });
    const qCanais = query(collection(db, "canais"), orderBy("nome", "asc"));
    const unsubCanais = onSnapshot(qCanais, (querySnapshot) => {
      const canaisArray: any[] = [];
      querySnapshot.forEach((doc) => canaisArray.push({ id: doc.id, ...doc.data() }));
      setCanaisDB(canaisArray);
    });
    return () => { unsubProd(); unsubCat(); unsubLocais(); unsubCanais(); };
  }, []);

  const gerarSKU = (nome: string) => `${(nome.trim().substring(0, 3).toUpperCase() || "PRO")}-${Math.floor(1000 + Math.random() * 9000)}`;
  const gerarIDUnidade = () => Math.random().toString(36).substring(2, 9).toUpperCase();
  const limparFormulario = () => {
    setModo("CRIAR"); setItemAtivo(null); setNome(""); setCategoria("");
    setSubcategoria(""); setPrecoCompra(""); setLocalCompra(""); setEstoque("");
    setFormaPagamento("PIX"); setParcelas(1); setDataCompra(new Date().toISOString().split("T")[0]);
  };

  const lancarFinanceiroAutomativo = async (custoTotal: number, nomeProd: string, produtoId: string) => {
    const batch = writeBatch(db);
    const grupoId = formaPagamento === "CARTAO" && parcelas > 1 ? `grupo_est_${Date.now()}` : null;
    const valorParcela = formaPagamento === "CARTAO" ? custoTotal / parcelas : custoTotal;
    const qtdLancamentos = formaPagamento === "CARTAO" ? parcelas : 1;
    let [anoBase, mesBase, diaBase] = dataCompra.split('-').map(Number);

    if (formaPagamento === "CARTAO" && diaBase > 25) {
      mesBase += 1;
      if (mesBase > 12) { mesBase -= 12; anoBase += 1; }
    }

    for (let i = 0; i < qtdLancamentos; i++) {
      let mesAdd = mesBase + i;
      let anoAdd = anoBase;
      while (mesAdd > 12) { mesAdd -= 12; anoAdd += 1; }
      let diaFinal = diaBase;
      if (mesAdd === 2 && diaFinal > 28) diaFinal = 28;
      if ([4, 6, 9, 11].includes(mesAdd) && diaFinal > 30) diaFinal = 30;

      const strData = `${anoAdd}-${String(mesAdd).padStart(2, '0')}-${String(diaFinal).padStart(2, '0')}`;
      const strMesAno = `${anoAdd}-${String(mesAdd).padStart(2, '0')}`;
      const desc = qtdLancamentos > 1 ? `Estoque: ${nomeProd} (${i + 1}/${parcelas})` : `Estoque: ${nomeProd}`;
      
      const novaTransacaoRef = doc(collection(db, "transacoes"));
      batch.set(novaTransacaoRef, {
        tipo: "DESPESA", descricao: desc, valor: valorParcela,
        categoriaDespesa: "ESSENCIAL", formaPagamento,
        data: strData, mesAno: strMesAno, pago: formaPagamento === "PIX",
        grupoId, produtoId, criadoEm: new Date()
      });
    }
    await batch.commit();
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!precoCompra || !estoque) return;
    const qtd = parseInt(estoque, 10);
    const custoTotal = parseFloat(precoCompra) * qtd;

    try {
      if (modo === "CRIAR") {
        if (!nome) return;
        const novasUnidades = Array.from({ length: qtd }, () => ({
          id: gerarIDUnidade(), precoCompra: parseFloat(precoCompra), precoVenda: 0,
          localCompra: localCompra || "Não informado", status: "aguardando recebimento", locaisAnunciados: [], observacao: ""
        }));
        // Salva e recupera a ID
        const docRef = await addDoc(collection(db, "produtos"), {
          nome, categoria: categoria || "Sem Categoria", subcategoria: subcategoria || "Sem Subcategoria",
          sku: gerarSKU(nome), unidades: novasUnidades, criadoEm: new Date()
        });
        await lancarFinanceiroAutomativo(custoTotal, nome, docRef.id);
      } 
      else if (modo === "EDITAR" && itemAtivo) {
        await updateDoc(doc(db, "produtos", itemAtivo.id), {
          nome, categoria: categoria || "Sem Categoria", subcategoria: subcategoria || "Sem Subcategoria",
        });
      } 
      else if (modo === "REPOR" && itemAtivo) {
        const novasUnidades = Array.from({ length: qtd }, () => ({
          id: gerarIDUnidade(), precoCompra: parseFloat(precoCompra), precoVenda: 0,
          localCompra: localCompra || "Não informado", status: "aguardando recebimento", locaisAnunciados: [], observacao: ""
        }));
        const unidadesExistentes = itemAtivo.unidades || [];
        await updateDoc(doc(db, "produtos", itemAtivo.id), { unidades: [...unidadesExistentes, ...novasUnidades] });
        await lancarFinanceiroAutomativo(custoTotal, itemAtivo.nome, itemAtivo.id);
      }
      limparFormulario();
    } catch (error) { console.error(error); alert("Erro ao processar."); }
  };

  const atualizarUnidade = async (produtoId: string, unidadeId: string, campo: string, valor: any) => {
    const produto = itens.find(i => i.id === produtoId);
    if (!produto) return;
    const unidadesAtualizadas = produto.unidades.map((u: any) => u.id === unidadeId ? { ...u, [campo]: valor } : u);
    try { await updateDoc(doc(db, "produtos", produtoId), { unidades: unidadesAtualizadas }); } catch (error) { console.error(error); }
  };

  const toggleCanalUnidade = async (produtoId: string, unidadeId: string, nomeCanal: string, canaisAtuais: string[]) => {
    const produto = itens.find(i => i.id === produtoId);
    if (!produto) return;
    const novaListaCanais = canaisAtuais.includes(nomeCanal) ? canaisAtuais.filter(c => c !== nomeCanal) : [...canaisAtuais, nomeCanal];
    const unidadesAtualizadas = produto.unidades.map((u: any) => u.id === unidadeId ? { ...u, locaisAnunciados: novaListaCanais } : u);
    try { await updateDoc(doc(db, "produtos", produtoId), { unidades: unidadesAtualizadas }); } catch (error) { console.error(error); }
  };

  // EXCLUSÃO COM INTEGRAÇÃO E POP-UP
  const excluirUnidade = async (produtoId: string, unidadeId: string, nomeProduto: string, custoUnidade: number) => {
    const msg = `CONFERÊNCIA DE EXCLUSÃO DE UNIDADE:\n\nCusto desta unidade: R$ ${custoUnidade.toFixed(2)}\n\nAo excluir, este valor será subtraído da próxima parcela atrelada a este produto no Fluxo de Caixa para manter seu saldo correto.\n\nConfirma a exclusão?`;
    if(!window.confirm(msg)) return;

    const produto = itens.find(i => i.id === produtoId);
    const unidadesRestantes = produto.unidades.filter((u: any) => u.id !== unidadeId);

    // Busca transacoes do Financeiro
    const qDocs = await getDocs(collection(db, "transacoes"));
    const trsRelacionadas = qDocs.docs.filter(d => d.data().produtoId === produtoId || (!d.data().produtoId && d.data().descricao.includes(nomeProduto))).map(d => ({id: d.id, ...d.data()}));
    trsRelacionadas.sort((a,b) => b.data.localeCompare(a.data)); // Mais recentes/futuras primeiro

    const batch = writeBatch(db);
    batch.update(doc(db, "produtos", produtoId), { unidades: unidadesRestantes });

    let abatimento = custoUnidade;
    for (const t of trsRelacionadas) {
      if (abatimento <= 0) break;
      if (t.valor <= abatimento) {
        batch.delete(doc(db, "transacoes", t.id));
        abatimento -= t.valor;
      } else {
        batch.update(doc(db, "transacoes", t.id), { valor: t.valor - abatimento });
        abatimento = 0;
      }
    }
    await batch.commit();
  };

  const excluirProdutoInteiro = async (id: string, nomeProduto: string) => {
    const qDocs = await getDocs(collection(db, "transacoes"));
    const trsRelacionadas = qDocs.docs.filter(d => d.data().produtoId === id || (!d.data().produtoId && d.data().descricao.includes(nomeProduto)));
    const totalAEstornar = trsRelacionadas.reduce((acc, curr) => acc + curr.data().valor, 0);

    const msg = `CONFERÊNCIA DE EXCLUSÃO DE LOTE (PRODUTO):\n\nProduto: ${nomeProduto}\nLançamentos atrelados no Fluxo de Caixa: ${trsRelacionadas.length}\nValor total que será apagado do financeiro: R$ ${totalAEstornar.toFixed(2)}\n\nDeseja confirmar a exclusão do produto e recalcular todo o caixa?`;

    if (window.confirm(msg)) {
      const batch = writeBatch(db);
      batch.delete(doc(db, "produtos", id));
      trsRelacionadas.forEach(t => batch.delete(doc(db, "transacoes", t.id)));
      await batch.commit();
      if (itemAtivo?.id === id) limparFormulario();
    }
  };

  const iniciarEdicao = (item: any) => { setModo("EDITAR"); setItemAtivo(item); setNome(item.nome); setCategoria(item.categoria || ""); setSubcategoria(item.subcategoria || ""); setPrecoCompra(""); setEstoque(""); setLocalCompra(""); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const iniciarReposicao = (item: any) => { setModo("REPOR"); setItemAtivo(item); setNome(item.nome); setCategoria(item.categoria || ""); setSubcategoria(item.subcategoria || ""); setPrecoCompra(""); setEstoque(""); setLocalCompra(""); setFormaPagamento("PIX"); setParcelas(1); setDataCompra(new Date().toISOString().split("T")[0]); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const toggleExpand = (id: string) => setExpandido(prev => ({ ...prev, [id]: !prev[id] }));

  const categoriasTabelaUnicas = Array.from(new Set(itens.map(item => item.categoria || "Sem Categoria").filter(Boolean)));
  const subcategoriasDisponiveisForm = categoriasDB.find(cat => cat.nome === categoria)?.subcategorias || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 text-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Painel de Vendas</h1>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Link href="/financeiro" className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition font-medium text-sm">💰 Fluxo de Caixa</Link>
            <Link href="/categorias" className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition font-medium text-sm">⚙️ Configurações / Canais</Link>
          </div>
        </div>

        {/* FORMULÁRIO */}
        <div className={`p-6 rounded-lg shadow-sm border mb-8 ${modo === "EDITAR" ? 'bg-amber-50' : modo === "REPOR" ? 'bg-emerald-50' : 'bg-white'}`}>
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex justify-between">
            {modo === "CRIAR" && "Cadastrar Novo Produto"}
            {modo === "EDITAR" && `Editando Cadastro: ${itemAtivo?.sku}`}
            {modo === "REPOR" && `Entrada de Estoque: ${itemAtivo?.sku}`}
            {modo !== "CRIAR" && <button onClick={limparFormulario} className="text-sm font-normal text-gray-500 hover:underline">Voltar para Cadastro</button>}
          </h2>

          <form onSubmit={handleSalvar} className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Produto</label>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} disabled={modo === "REPOR"} className="w-full p-2 border rounded bg-white" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Categoria</label>
              <select value={categoria} onChange={(e) => {setCategoria(e.target.value); setSubcategoria("");}} disabled={modo === "REPOR"} className="w-full p-2 border rounded bg-white">
                <option value="">-- Selecione --</option>
                {categoriasDB.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Subcategoria</label>
              <select value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)} disabled={modo === "REPOR" || !categoria} className="w-full p-2 border rounded bg-white">
                <option value="">-- Selecione --</option>
                {subcategoriasDisponiveisForm.map((sub: string, i: number) => <option key={i} value={sub}>{sub}</option>)}
              </select>
            </div>

            {modo !== "EDITAR" && (
              <>
                <div className="md:col-span-6 border-t pt-4 mt-2">
                  <h3 className="text-sm font-bold text-gray-600 mb-3">Dados da Compra (Integração Financeira Automática)</h3>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Local (Fornecedor)</label>
                  <select value={localCompra} onChange={(e) => setLocalCompra(e.target.value)} className="w-full p-2 border rounded bg-white">
                    <option value="">-- Selecione --</option>
                    {locaisDB.map(loc => <option key={loc.id} value={loc.nome}>{loc.nome}</option>)}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Data da Compra</label>
                  <input type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} className="w-full p-2 border rounded bg-white" />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Qtd</label>
                  <input type="number" step="1" value={estoque} onChange={(e) => setEstoque(e.target.value)} placeholder="0" className="w-full p-2 border rounded bg-white" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Custo Unitário (R$)</label>
                  <input type="number" step="0.01" value={precoCompra} onChange={(e) => setPrecoCompra(e.target.value)} placeholder="0.00" className="w-full p-2 border rounded bg-white" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Forma de Pagamento</label>
                  <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value as any)} className="w-full p-2 border rounded bg-white font-semibold text-blue-800">
                    <option value="PIX">Pix / Boleto à vista</option>
                    <option value="CARTAO">Cartão de Crédito</option>
                  </select>
                </div>
                {formaPagamento === "CARTAO" && (
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium mb-1">Parcelas</label>
                    <input type="number" min="1" max="24" value={parcelas} onChange={(e) => setParcelas(parseInt(e.target.value)||1)} className="w-full p-2 border rounded bg-white" />
                  </div>
                )}
                
                {(precoCompra && estoque) && (
                  <div className={`md:col-span-3 flex items-center p-2 rounded ${formaPagamento === 'CARTAO' && parcelas > 1 ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-800'}`}>
                    <span className="text-sm">
                      Total: <b>R$ {(parseFloat(precoCompra) * parseInt(estoque)).toFixed(2)}</b> será lançado no Fluxo de Caixa 
                      {formaPagamento === 'CARTAO' && parcelas > 1 ? ` em ${parcelas}x de R$ ${((parseFloat(precoCompra) * parseInt(estoque)) / parcelas).toFixed(2)}` : ' à vista'}.
                    </span>
                  </div>
                )}
              </>
            )}

            <div className="md:col-span-6 mt-4">
              <button type="submit" className={`text-white px-6 py-2 rounded font-medium ${modo === "EDITAR" ? 'bg-amber-500' : modo === "REPOR" ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                {modo === "CRIAR" && "Cadastrar Produto e Lançar no Financeiro"}
                {modo === "EDITAR" && "Salvar Alterações"}
                {modo === "REPOR" && "Adicionar Lote e Lançar no Financeiro"}
              </button>
            </div>
          </form>
        </div>

        {/* TABELA AGRUPADA */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-gray-100 border-b-2 border-gray-300">
              <tr>
                <th className="p-4 font-semibold text-sm w-1/3">Produto / SKU</th>
                <th className="p-4 font-semibold text-sm text-center">Ticket Médio (Compra)</th>
                <th className="p-4 font-semibold text-sm text-center">Ticket Médio (Venda)</th>
                <th className="p-4 font-semibold text-sm text-center">Estoque Ativo</th>
                <th className="p-4 font-semibold text-sm text-center">ROI Médio</th>
                <th className="p-4 font-semibold text-sm text-right">Ações Principais</th>
              </tr>
            </thead>
            {carregando ? <tbody><tr><td colSpan={6} className="p-4 text-center text-gray-500">Carregando...</td></tr></tbody> : itens.length === 0 ? <tbody><tr><td colSpan={6} className="p-4 text-center text-gray-500">Nenhum produto cadastrado.</td></tr></tbody> : (
              categoriasTabelaUnicas.map(catNome => {
                const itensDestaCategoria = itens.filter(i => (i.categoria || "Sem Categoria") === catNome);
                return (
                  <tbody key={catNome as string}>
                    <tr className="bg-gray-800 text-white"><td colSpan={6} className="p-2 px-4 font-bold text-sm tracking-wider uppercase">{catNome as string}</td></tr>
                    {itensDestaCategoria.map(item => {
                      const unidades = item.unidades || [];
                      const unidadesAtivas = unidades.filter((u: any) => u.status !== 'finalizado');
                      const qtdEstoque = unidadesAtivas.length;
                      const totalCompra = unidades.reduce((acc: number, u: any) => acc + (Number(u.precoCompra) || 0), 0);
                      const ticketCompra = unidades.length > 0 ? totalCompra / unidades.length : 0;
                      const unidadesComVenda = unidades.filter((u: any) => (Number(u.precoVenda) || 0) > 0);
                      const totalVenda = unidadesComVenda.reduce((acc: number, u: any) => acc + (Number(u.precoVenda) || 0), 0);
                      const ticketVenda = unidadesComVenda.length > 0 ? totalVenda / unidadesComVenda.length : 0;
                      const roi = ticketCompra > 0 && ticketVenda > 0 ? ((ticketVenda - ticketCompra) / ticketCompra) * 100 : 0;
                      const isExpanded = expandido[item.id];

                      return (
                        <Fragment key={item.id}>
                          <tr className={`border-b hover:bg-blue-50 cursor-pointer transition ${isExpanded ? 'bg-blue-50' : ''}`} onClick={() => toggleExpand(item.id)}>
                            <td className="p-4"><div className="font-bold text-gray-800">{item.nome}</div><div className="text-xs text-blue-600 font-mono mt-1">{item.sku}</div></td>
                            <td className="p-4 text-center text-red-600 font-medium">R$ {ticketCompra.toFixed(2)}</td>
                            <td className="p-4 text-center text-green-600 font-medium">{ticketVenda > 0 ? `R$ ${ticketVenda.toFixed(2)}` : '-'}</td>
                            <td className="p-4 text-center"><span className={`px-3 py-1 rounded-full text-sm font-bold ${qtdEstoque > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>{qtdEstoque} un.</span></td>
                            <td className="p-4 text-center font-bold text-amber-600">{roi > 0 ? `${roi.toFixed(1)}%` : '-'}</td>
                            <td className="p-4 text-right space-x-2">
                              <button onClick={(e) => { e.stopPropagation(); iniciarReposicao(item); }} className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-semibold hover:bg-emerald-200">+ Repor</button>
                              <button onClick={(e) => { e.stopPropagation(); iniciarEdicao(item); }} className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs font-semibold hover:bg-gray-300">Editar</button>
                              <button onClick={(e) => { e.stopPropagation(); excluirProdutoInteiro(item.id, item.nome); }} className="text-red-500 hover:text-red-700 text-xs font-bold px-1">X</button>
                            </td>
                          </tr>
                          {isExpanded && unidades.length > 0 && (
                            <tr className="bg-gray-50 border-b">
                              <td colSpan={6} className="p-0">
                                <div className="p-4 pl-8 shadow-inner overflow-x-auto">
                                  <table className="w-full text-sm text-left bg-white border border-gray-200 rounded min-w-[1000px]">
                                    <thead className="bg-gray-100">
                                      <tr><th className="p-2 border-b w-24">ID</th><th className="p-2 border-b">Fornecedor</th><th className="p-2 border-b">Custo (R$)</th><th className="p-2 border-b">Venda (R$)</th><th className="p-2 border-b w-36">Status</th><th className="p-2 border-b w-48">Anunciado em</th><th className="p-2 border-b">Observação</th><th className="p-2 border-b text-center">Ações</th></tr>
                                    </thead>
                                    <tbody>
                                      {unidades.map((u: any) => (
                                        <tr key={u.id} className="hover:bg-gray-50 border-b last:border-0">
                                          <td className="p-2 font-mono text-gray-500 text-[10px]">{u.id}</td>
                                          <td className="p-2 text-gray-600 text-xs">{u.localCompra}</td>
                                          <td className="p-2 text-red-600 font-medium">R$ {Number(u.precoCompra).toFixed(2)}</td>
                                          <td className="p-2"><input type="number" step="0.01" defaultValue={u.precoVenda || ""} onBlur={(e) => atualizarUnidade(item.id, u.id, "precoVenda", parseFloat(e.target.value) || 0)} placeholder="0.00" className="w-20 p-1 border rounded text-green-700 font-medium text-xs" /></td>
                                          <td className="p-2">
                                            <select value={u.status} onChange={(e) => atualizarUnidade(item.id, u.id, "status", e.target.value)} className={`w-full p-1 border rounded text-[10px] font-semibold ${u.status === 'finalizado' ? 'bg-green-100 text-green-800' : u.status === 'enviado' ? 'bg-blue-100 text-blue-800' : u.status === 'para anuncio' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'}`}>
                                              <option value="aguardando recebimento">Aguard. Recebimento</option><option value="para anuncio">Para Anúncio</option><option value="anunciado">Anunciado</option><option value="aguardando entrega">Aguard. Entrega</option><option value="enviado">Enviado</option><option value="finalizado">Finalizado (Vendido)</option>
                                            </select>
                                          </td>
                                          <td className="p-2">
                                            <div className="flex flex-wrap gap-1">
                                              {canaisDB.length === 0 && <span className="text-[10px] text-gray-400">Sem canais</span>}
                                              {canaisDB.map(canal => {
                                                const locais = u.locaisAnunciados || [];
                                                const ativo = locais.includes(canal.nome);
                                                return (<button key={canal.id} onClick={() => toggleCanalUnidade(item.id, u.id, canal.nome, locais)} className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${ativo ? 'bg-purple-600 text-white border-purple-700 font-bold' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`} title={`Clique para marcar/desmarcar: ${canal.nome}`}>{canal.nome}</button>)
                                              })}
                                            </div>
                                          </td>
                                          <td className="p-2"><input type="text" defaultValue={u.observacao || ""} onBlur={(e) => atualizarUnidade(item.id, u.id, "observacao", e.target.value)} placeholder="Rastreio..." className="w-full p-1 border rounded text-xs text-gray-700 focus:ring-blue-500" /></td>
                                          <td className="p-2 text-center"><button onClick={() => excluirUnidade(item.id, u.id, item.nome, u.precoCompra)} className="text-red-400 hover:text-red-700 font-bold">X</button></td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                )
              })
            )}
          </table>
        </div>
      </div>
    </div>
  );
}