"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

type ModoFormulario = "CRIAR" | "EDITAR" | "REPOR";

export default function Home() {
  // Estados do formulário
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [precoCompra, setPrecoCompra] = useState(""); // Na reposição, é o preço da nova aquisição
  const [precoVenda, setPrecoVenda] = useState("");
  const [estoque, setEstoque] = useState(""); // Na reposição, é a qtd comprada

  const [itens, setItens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  
  // Controle de estado da interface
  const [modo, setModo] = useState<ModoFormulario>("CRIAR");
  const [itemAtivo, setItemAtivo] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, "produtos"), orderBy("criadoEm", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const produtosFirestore: any[] = [];
      querySnapshot.forEach((documento) => {
        produtosFirestore.push({ id: documento.id, ...documento.data() });
      });
      setItens(produtosFirestore);
      setCarregando(false);
    });
    return () => unsubscribe();
  }, []);

  const gerarSKU = (nomeProduto: string) => {
    const prefixo = nomeProduto.trim().substring(0, 3).toUpperCase() || "PRO";
    const numero = Math.floor(1000 + Math.random() * 9000);
    return `${prefixo}-${numero}`;
  };

  const limparFormulario = () => {
    setModo("CRIAR");
    setItemAtivo(null);
    setNome("");
    setCategoria("");
    setSubcategoria("");
    setPrecoCompra("");
    setPrecoVenda("");
    setEstoque("");
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!precoCompra || !estoque) return;

    try {
      if (modo === "CRIAR") {
        if (!nome || !precoVenda) return;
        await addDoc(collection(db, "produtos"), {
          nome,
          categoria: categoria || "Sem Categoria",
          subcategoria: subcategoria || "Sem Subcategoria",
          sku: gerarSKU(nome),
          precoCompra: parseFloat(precoCompra), // Aqui o Preço Compra é o Preço Médio Inicial
          precoVenda: parseFloat(precoVenda),
          estoque: parseInt(estoque, 10),
          criadoEm: new Date()
        });
      } 
      
      else if (modo === "EDITAR" && itemAtivo) {
        await updateDoc(doc(db, "produtos", itemAtivo.id), {
          nome,
          categoria: categoria || "Sem Categoria",
          subcategoria: subcategoria || "Sem Subcategoria",
          precoCompra: parseFloat(precoCompra), // Forçando edição manual do preço médio
          precoVenda: parseFloat(precoVenda),
          estoque: parseInt(estoque, 10),
        });
      } 
      
      else if (modo === "REPOR" && itemAtivo) {
        // LÓGICA DO PREÇO MÉDIO
        const qtdComprada = parseInt(estoque, 10);
        const precoNovo = parseFloat(precoCompra);
        const novoEstoque = itemAtivo.estoque + qtdComprada;
        
        // (Estoque Atual * Preco Medio Atual) + (Qtd Nova * Preco Novo) / Novo Estoque
        const custoTotalAtual = itemAtivo.estoque * itemAtivo.precoCompra;
        const custoNovaCompra = qtdComprada * precoNovo;
        const novoPrecoMedio = (custoTotalAtual + custoNovaCompra) / novoEstoque;

        await updateDoc(doc(db, "produtos", itemAtivo.id), {
          estoque: novoEstoque,
          precoCompra: novoPrecoMedio, // Atualiza para o novo preço médio calculado
          precoVenda: parseFloat(precoVenda), // Atualiza preço de venda se o usuário mudou
        });
      }

      limparFormulario();
    } catch (error) {
      console.error("Erro ao salvar: ", error);
      alert("Erro ao processar a requisição.");
    }
  };

  const iniciarEdicao = (item: any) => {
    setModo("EDITAR");
    setItemAtivo(item);
    setNome(item.nome);
    setCategoria(item.categoria || "");
    setSubcategoria(item.subcategoria || "");
    setPrecoCompra(item.precoCompra.toString());
    setPrecoVenda(item.precoVenda.toString());
    setEstoque(item.estoque.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const iniciarReposicao = (item: any) => {
    setModo("REPOR");
    setItemAtivo(item);
    setNome(item.nome); // Mostramos apenas para referência, mas desabilitado
    setCategoria(item.categoria || ""); // Desabilitado
    setSubcategoria(item.subcategoria || ""); // Desabilitado
    setPrecoCompra(""); // Vazio para digitar o custo da nova aquisição
    setPrecoVenda(item.precoVenda.toString()); // Puxa o atual caso queira reajustar
    setEstoque(""); // Vazio para digitar a qtd nova
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleVender = async (id: string, estoqueAtual: number) => {
    if (estoqueAtual <= 0) return alert("Produto sem estoque!");
    try {
      await updateDoc(doc(db, "produtos", id), { estoque: estoqueAtual - 1 });
    } catch (error) {
      console.error("Erro ao vender: ", error);
    }
  };

  const handleExcluir = async (id: string) => {
    if (window.confirm("Apagar este produto permanentemente?")) {
      try {
        await deleteDoc(doc(db, "produtos", id));
        if (itemAtivo?.id === id) limparFormulario();
      } catch (error) {
        console.error("Erro ao excluir: ", error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 text-gray-800">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Painel de Vendas</h1>

        {/* FORMULÁRIO DINÂMICO */}
        <div className={`p-6 rounded-lg shadow-sm border mb-8 transition-colors ${
          modo === "EDITAR" ? 'bg-amber-50 border-amber-200' : 
          modo === "REPOR" ? 'bg-emerald-50 border-emerald-200' : 
          'bg-white border-gray-200'
        }`}>
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center justify-between">
            {modo === "CRIAR" && "Cadastrar Novo Produto"}
            {modo === "EDITAR" && `Editando: ${itemAtivo?.sku}`}
            {modo === "REPOR" && `Repor Estoque: ${itemAtivo?.sku}`}
            
            {modo !== "CRIAR" && (
              <button onClick={limparFormulario} className="text-sm font-normal text-gray-500 hover:text-gray-800 underline">
                Voltar para Cadastro
              </button>
            )}
          </h2>

          <form onSubmit={handleSalvar} className="grid grid-cols-1 md:grid-cols-6 gap-4">
            
            {/* Linha 1: Dados do Produto */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={modo === "REPOR"} // Não pode mudar o nome na reposição
                placeholder="Ex: Interruptor Tuya"
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 disabled:bg-gray-100 bg-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <input
                type="text"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                disabled={modo === "REPOR"}
                placeholder="Ex: Smart Home"
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 disabled:bg-gray-100 bg-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Subcategoria</label>
              <input
                type="text"
                value={subcategoria}
                onChange={(e) => setSubcategoria(e.target.value)}
                disabled={modo === "REPOR"}
                placeholder="Ex: Automação Elétrica"
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 disabled:bg-gray-100 bg-white"
              />
            </div>

            {/* Linha 2: Valores e Estoque */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {modo === "REPOR" ? "Custo Unitário da Nova Compra (R$)" : "Custo Unitário (R$)"}
              </label>
              <input
                type="number" step="0.01" value={precoCompra}
                onChange={(e) => setPrecoCompra(e.target.value)}
                placeholder="0.00"
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 bg-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço de Venda Final (R$)</label>
              <input
                type="number" step="0.01" value={precoVenda}
                onChange={(e) => setPrecoVenda(e.target.value)}
                placeholder="0.00"
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 bg-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {modo === "REPOR" ? "Quantidade Adquirida" : "Estoque Inicial"}
              </label>
              <input
                type="number" step="1" value={estoque}
                onChange={(e) => setEstoque(e.target.value)}
                placeholder="0"
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Botão de Ação Dinâmico */}
            <div className="md:col-span-6 mt-2">
              <button
                type="submit"
                className={`text-white px-6 py-2 rounded transition font-medium w-full md:w-auto ${
                  modo === "EDITAR" ? 'bg-amber-500 hover:bg-amber-600' : 
                  modo === "REPOR" ? 'bg-emerald-600 hover:bg-emerald-700' : 
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {modo === "CRIAR" && "Cadastrar Novo Produto"}
                {modo === "EDITAR" && "Salvar Alterações"}
                {modo === "REPOR" && "Confirmar Entrada de Estoque"}
              </button>
            </div>
          </form>
        </div>

        {/* TABELA */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 border-b font-semibold text-sm">SKU / Categoria</th>
                <th className="p-4 border-b font-semibold text-sm">Produto</th>
                <th className="p-4 border-b font-semibold text-sm">Estoque</th>
                <th className="p-4 border-b font-semibold text-sm">Preço Médio</th>
                <th className="p-4 border-b font-semibold text-sm">Preço Venda</th>
                <th className="p-4 border-b font-semibold text-sm">Margem Bruta</th>
                <th className="p-4 border-b font-semibold text-center text-sm">Ações</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan={7} className="p-4 text-center text-gray-500">Carregando...</td></tr>
              ) : itens.length === 0 ? (
                <tr><td colSpan={7} className="p-4 text-center text-gray-500">Nenhum produto.</td></tr>
              ) : (
                itens.map((item) => {
                  const margem = item.precoVenda - item.precoCompra;
                  
                  return (
                    <tr key={item.id} className={`hover:bg-gray-50 ${item.estoque <= 0 ? 'bg-red-50' : ''}`}>
                      <td className="p-4 border-b">
                        <div className="font-mono text-sm text-blue-600 font-medium">{item.sku}</div>
                        <div className="text-xs text-gray-500 mt-1">{item.categoria}</div>
                      </td>
                      <td className="p-4 border-b font-medium">{item.nome}</td>
                      <td className="p-4 border-b font-bold text-gray-800">
                        {item.estoque > 0 ? `${item.estoque} un.` : <span className="text-red-500 text-sm">Esgotado</span>}
                      </td>
                      <td className="p-4 border-b text-amber-600">R$ {item.precoCompra.toFixed(2)}</td>
                      <td className="p-4 border-b text-green-600 font-medium">R$ {item.precoVenda.toFixed(2)}</td>
                      <td className="p-4 border-b text-gray-600">R$ {margem.toFixed(2)}</td>
                      <td className="p-4 border-b text-center space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleVender(item.id, item.estoque)}
                          disabled={item.estoque <= 0}
                          className="bg-gray-800 text-white px-2 py-1 rounded hover:bg-gray-700 disabled:opacity-30 text-xs font-semibold"
                        >
                          Vender
                        </button>
                        <button
                          onClick={() => iniciarReposicao(item)}
                          className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200 text-xs font-semibold"
                        >
                          Repor
                        </button>
                        <button
                          onClick={() => iniciarEdicao(item)}
                          className="bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 text-xs font-semibold"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleExcluir(item.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-bold px-1"
                        >
                          X
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}