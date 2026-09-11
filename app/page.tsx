"use client";
import React, { useState, useEffect, Fragment } from "react";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import Link from "next/link"; 

export default function Fornecedores() {
  // --- ESTADOS DO FORMULÁRIO ---
  // 1. Dados Gerais
  const [nome, setNome] = useState("");
  const [plataforma, setPlataforma] = useState("");
  const [linkLoja, setLinkLoja] = useState("");
  
  // 2. Contatos Diretos
  const [contatoNome, setContatoNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [wechat, setWechat] = useState("");
  const [email, setEmail] = useState("");
  
  // 3. Logística Base
  const [paisOrigem, setPaisOrigem] = useState("");
  const [fusoHorario, setFusoHorario] = useState("");
  const [tempoProcessamento, setTempoProcessamento] = useState("");
  
  // 4. Catálogo e Financeiro
  const [nicho, setNicho] = useState("");
  const [skusInteresse, setSkusInteresse] = useState("");
  const [anotacoesPreco, setAnotacoesPreco] = useState("");
  const [ltv, setLtv] = useState("");
  const [metodosPagamento, setMetodosPagamento] = useState("");
  
  // 5. Observações
  const [observacoes, setObservacoes] = useState("");

  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const q = query(collection(db, "fornecedores"), orderBy("criadoEm", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const lista: any[] = [];
      querySnapshot.forEach((doc) => lista.push({ id: doc.id, ...doc.data() }));
      setFornecedores(lista);
      setCarregando(false);
    });
    return () => unsubscribe();
  }, []);

  const limparFormulario = () => {
    setEditandoId(null);
    setNome(""); setPlataforma(""); setLinkLoja("");
    setContatoNome(""); setWhatsapp(""); setWechat(""); setEmail("");
    setPaisOrigem(""); setFusoHorario(""); setTempoProcessamento("");
    setNicho(""); setSkusInteresse(""); setAnotacoesPreco("");
    setLtv(""); setMetodosPagamento(""); setObservacoes("");
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();

    const dadosFornecedor = {
      nome: nome || "", 
      plataforma: plataforma || "", 
      linkLoja: linkLoja || "",
      contatoNome: contatoNome || "", 
      whatsapp: whatsapp || "", 
      wechat: wechat || "", 
      email: email || "",
      paisOrigem: paisOrigem || "", 
      fusoHorario: fusoHorario || "", 
      tempoProcessamento: tempoProcessamento || "",
      nicho: nicho || "", 
      skusInteresse: skusInteresse || "", 
      anotacoesPreco: anotacoesPreco || "",
      ltv: ltv ? parseFloat(ltv) : 0, 
      metodosPagamento: metodosPagamento || "", 
      observacoes: observacoes || "",
    };

    try {
      if (editandoId) {
        await updateDoc(doc(db, "fornecedores", editandoId), dadosFornecedor);
      } else {
        await addDoc(collection(db, "fornecedores"), { ...dadosFornecedor, criadoEm: new Date() });
      }
      limparFormulario();
    } catch (error) {
      console.error("Detalhes do Erro no Firebase: ", error); 
      alert("Erro ao salvar. Verifique se a sua conexão está ativa.");
    }
  };

  const iniciarEdicao = (forn: any) => {
    setEditandoId(forn.id);
    setNome(forn.nome || ""); setPlataforma(forn.plataforma || ""); setLinkLoja(forn.linkLoja || "");
    setContatoNome(forn.contatoNome || ""); setWhatsapp(forn.whatsapp || ""); setWechat(forn.wechat || ""); setEmail(forn.email || "");
    setPaisOrigem(forn.paisOrigem || ""); setFusoHorario(forn.fusoHorario || ""); setTempoProcessamento(forn.tempoProcessamento || "");
    setNicho(forn.nicho || ""); setSkusInteresse(forn.skusInteresse || ""); setAnotacoesPreco(forn.anotacoesPreco || "");
    setLtv(forn.ltv?.toString() || ""); setMetodosPagamento(forn.metodosPagamento || ""); setObservacoes(forn.observacoes || "");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const excluirFornecedor = async (id: string) => {
    if (window.confirm("Tem certeza que deseja apagar a ficha deste fornecedor permanentemente?")) {
      await deleteDoc(doc(db, "fornecedores", id));
      if (editandoId === id) limparFormulario();
    }
  };

  const toggleExpand = (id: string) => setExpandido(prev => ({ ...prev, [id]: !prev[id] }));

  // --- CARDS DO DASHBOARD ---
  const totalFornecedores = fornecedores.length;
  const ltvGlobal = fornecedores.reduce((acc, curr) => acc + (Number(curr.ltv) || 0), 0);
  
  const plataformasContagem = fornecedores.reduce((acc, curr) => {
    const p = curr.plataforma || "Outros";
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // CORREÇÃO TYPESCRIPT: Adicionado o tipo (a: any, b: any) no sort para a Vercel não travar
  const topPlataformas = Object.entries(plataformasContagem).sort((a: any, b: any) => b[1] - a[1]).slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 text-gray-800">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestão de Fornecedores</h1>
            <p className="text-sm text-gray-500 mt-1">Diretório Central (SRM)</p>
          </div>
          <div className="flex gap-3">
            <Link href="/financeiro" className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition font-medium text-sm flex items-center gap-2 shadow-sm">
              💰 Fluxo de Caixa
            </Link>
          </div>
        </div>

        {/* CARDS DE RESUMO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-blue-600">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Parceiros</h3>
            <p className="text-2xl font-bold text-blue-900 mt-1">{totalFornecedores}</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-emerald-500">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Volume Gasto (LTV Total)</h3>
            <p className="text-2xl font-bold text-emerald-700 mt-1">R$ {ltvGlobal.toFixed(2)}</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-purple-500">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Plataformas Principais</h3>
            <div className="mt-1 flex gap-2">
              {/* CORREÇÃO TYPESCRIPT: Adicionado o tipo (p: any) no map */}
              {topPlataformas.length > 0 ? topPlataformas.map((p: any) => (
                <span key={p[0]} className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded">{p[0]}: {p[1]}</span>
              )) : <span className="text-sm text-gray-400">Nenhum dado</span>}
            </div>
          </div>
        </div>

        {/* FORMULÁRIO COMPLETO */}
        <div className={`p-6 rounded-lg shadow-sm border mb-8 ${editandoId ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-between items-center mb-6 border-b pb-3">
            <h2 className="text-xl font-bold text-gray-800">
              {editandoId ? "✏️ Editando Ficha Cadastral" : "➕ Novo Fornecedor"}
            </h2>
            {editandoId && <button type="button" onClick={limparFormulario} className="text-sm text-gray-500 hover:text-gray-800 underline">Cancelar Edição</button>}
          </div>

          <form onSubmit={handleSalvar} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3"><h3 className="text-sm font-bold text-blue-700 uppercase tracking-wide">1. Dados Gerais</h3></div>
              <div>
                <label className="block text-xs font-semibold mb-1">Nome do Fornecedor / Empresa</label>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full p-2 border rounded bg-white text-sm" placeholder="Ex: Tuya Official Store" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Plataforma Origem</label>
                <select value={plataforma} onChange={e => setPlataforma(e.target.value)} className="w-full p-2 border rounded bg-white text-sm">
                  <option value="">Selecione...</option><option value="AliExpress">AliExpress</option><option value="Shopee">Shopee</option><option value="Alibaba">Alibaba</option><option value="Direto">Direto (Independente)</option><option value="Outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Link da Loja / Site</label>
                <input type="url" value={linkLoja} onChange={e => setLinkLoja(e.target.value)} className="w-full p-2 border rounded bg-white text-sm" placeholder="https://" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t pt-4">
              <div className="md:col-span-4"><h3 className="text-sm font-bold text-blue-700 uppercase tracking-wide">2. Contatos Diretos</h3></div>
              <div>
                <label className="block text-xs font-semibold mb-1">Atendente / Vendedor</label>
                <input type="text" value={contatoNome} onChange={e => setContatoNome(e.target.value)} className="w-full p-2 border rounded bg-white text-sm" placeholder="Ex: Mr. Chen, Alice" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">WhatsApp</label>
                <input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full p-2 border rounded bg-white text-sm" placeholder="+86 123 4567" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">WeChat ID</label>
                <input type="text" value={wechat} onChange={e => setWechat(e.target.value)} className="w-full p-2 border rounded bg-white text-sm" placeholder="ID do WeChat" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">E-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded bg-white text-sm" placeholder="contato@empresa.com" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 border-t pt-4">
              <div className="md:col-span-3 space-y-4">
                <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wide">3. Logística</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1">País de Origem</label>
                    <input type="text" value={paisOrigem} onChange={e => setPaisOrigem(e.target.value)} className="w-full p-2 border rounded bg-white text-sm" placeholder="Ex: China, Brasil" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Fuso Horário</label>
                    <input type="text" value={fusoHorario} onChange={e => setFusoHorario(e.target.value)} className="w-full p-2 border rounded bg-white text-sm" placeholder="Ex: UTC+8 (11h a mais)" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Tempo de Processamento (Dias)</label>
                  <input type="text" value={tempoProcessamento} onChange={e => setTempoProcessamento(e.target.value)} className="w-full p-2 border rounded bg-white text-sm" placeholder="Ex: Envia em 48h" />
                </div>
              </div>

              <div className="md:col-span-3 space-y-4">
                <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wide">4. Catálogo & Comercial</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Nicho Principal</label>
                    <input type="text" value={nicho} onChange={e => setNicho(e.target.value)} className="w-full p-2 border rounded bg-white text-sm" placeholder="Ex: Automação" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Métodos de Pagamento</label>
                    <input type="text" value={metodosPagamento} onChange={e => setMetodosPagamento(e.target.value)} className="w-full p-2 border rounded bg-white text-sm" placeholder="Ex: AliPay, Pix, Remessa" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Anotações de Preço / Descontos</label>
                  <input type="text" value={anotacoesPreco} onChange={e => setAnotacoesPreco(e.target.value)} className="w-full p-2 border rounded bg-white text-sm" placeholder="Ex: 10% off acima de 50 un." />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
              <div className="md:col-span-2"><h3 className="text-sm font-bold text-blue-700 uppercase tracking-wide">5. Histórico e Observações</h3></div>
              <div>
                <label className="block text-xs font-semibold mb-1">Volume Já Gasto (LTV) - R$</label>
                <input type="number" step="0.01" value={ltv} onChange={e => setLtv(e.target.value)} className="w-full p-2 border rounded bg-white text-sm" placeholder="Total que já comprou deles" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">SKUs Chave / Produtos Frequentes</label>
                <input type="text" value={skusInteresse} onChange={e => setSkusInteresse(e.target.value)} className="w-full p-2 border rounded bg-white text-sm" placeholder="Ex: Interruptores, Fitas LED" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold mb-1">Observações e Alertas (Cupons, problemas anteriores)</label>
                <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3} className="w-full p-2 border rounded bg-white text-sm" placeholder="Anotações livres sobre este fornecedor..." />
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" className={`text-white px-8 py-3 rounded font-bold w-full md:w-auto shadow-md transition ${editandoId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {editandoId ? "Salvar Ficha Editada" : "Salvar Novo Fornecedor"}
              </button>
            </div>
          </form>
        </div>

        {/* TABELA DE DIRETÓRIO */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-gray-100 border-b-2 border-gray-300">
              <tr>
                <th className="p-4 font-semibold text-sm w-1/3">Fornecedor</th>
                <th className="p-4 font-semibold text-sm">Nicho / SKUs</th>
                <th className="p-4 font-semibold text-sm text-center">Volume (LTV)</th>
                <th className="p-4 font-semibold text-sm text-center">Contato Rápido</th>
                <th className="p-4 font-semibold text-sm text-right">Ações</th>
              </tr>
            </thead>
            
            {carregando ? <tbody><tr><td colSpan={5} className="p-4 text-center text-gray-500">Carregando diretório...</td></tr></tbody> 
            : fornecedores.length === 0 ? <tbody><tr><td colSpan={5} className="p-4 text-center text-gray-500">Nenhum fornecedor cadastrado.</td></tr></tbody> 
            : (
              <tbody>
                {fornecedores.map(forn => {
                  const isExpanded = expandido[forn.id];
                  return (
                    <Fragment key={forn.id}>
                      <tr className={`border-b hover:bg-blue-50 cursor-pointer transition ${isExpanded ? 'bg-blue-50' : ''}`} onClick={() => toggleExpand(forn.id)}>
                        <td className="p-4">
                          <div className="font-bold text-gray-900">{forn.nome || "Fornecedor Sem Nome"}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded uppercase font-bold">{forn.plataforma || 'N/A'}</span>
                            {forn.paisOrigem && <span className="text-xs text-gray-500">🌍 {forn.paisOrigem}</span>}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm font-medium text-gray-800">{forn.nicho || '-'}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5 max-w-[200px] truncate">{forn.skusInteresse || '-'}</div>
                        </td>
                        <td className="p-4 text-center font-bold text-emerald-700">
                          {forn.ltv > 0 ? `R$ ${Number(forn.ltv).toFixed(2)}` : '-'}
                        </td>
                        <td className="p-4 text-center space-x-2">
                          {forn.whatsapp && <a href={`https://wa.me/${forn.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="text-green-600 font-bold text-xl" title="Chamar no WhatsApp" onClick={e => e.stopPropagation()}>💬</a>}
                          {forn.wechat && <span className="text-green-500 font-bold text-xl" title={`WeChat: ${forn.wechat}`}>🇨🇳</span>}
                          {forn.linkLoja && <a href={forn.linkLoja} target="_blank" rel="noreferrer" className="text-blue-600 font-bold text-xl" title="Ir para a loja" onClick={e => e.stopPropagation()}>🛒</a>}
                        </td>
                        <td className="p-4 text-right space-x-3">
                          <button onClick={(e) => { e.stopPropagation(); iniciarEdicao(forn); }} className="text-blue-600 hover:text-blue-800 text-sm font-bold">Editar</button>
                          <button onClick={(e) => { e.stopPropagation(); excluirFornecedor(forn.id); }} className="text-red-500 hover:text-red-700 text-sm font-bold">Excluir</button>
                        </td>
                      </tr>
                      
                      {/* FICHA EXPANDIDA */}
                      {isExpanded && (
                        <tr className="bg-white border-b shadow-inner">
                          <td colSpan={5} className="p-0">
                            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm border-l-4 border-l-blue-400">
                              
                              <div className="space-y-2">
                                <h4 className="font-bold text-gray-800 border-b pb-1">👤 Contatos</h4>
                                <p><span className="text-gray-500">Vendedor:</span> {forn.contatoNome || '-'}</p>
                                <p><span className="text-gray-500">Email:</span> {forn.email || '-'}</p>
                                <p><span className="text-gray-500">WeChat ID:</span> {forn.wechat || '-'}</p>
                              </div>

                              <div className="space-y-2">
                                <h4 className="font-bold text-gray-800 border-b pb-1">📦 Logística & Financeiro</h4>
                                <p><span className="text-gray-500">Processamento:</span> {forn.tempoProcessamento || '-'}</p>
                                <p><span className="text-gray-500">Fuso Horário:</span> {forn.fusoHorario || '-'}</p>
                                <p><span className="text-gray-500">Pagtos Aceitos:</span> {forn.metodosPagamento || '-'}</p>
                              </div>

                              <div className="space-y-2">
                                <h4 className="font-bold text-gray-800 border-b pb-1">📝 Observações & Acordos</h4>
                                <p><span className="text-gray-500">Descontos:</span> {forn.anotacoesPreco || '-'}</p>
                                <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded text-xs whitespace-pre-wrap">
                                  {forn.observacoes || 'Nenhuma observação registrada.'}
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            )}
          </table>
        </div>

      </div>
    </div>
  );
}