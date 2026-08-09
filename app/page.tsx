"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import Link from "next/link"; // Adicionado para criar o botão de navegação

type ModoFormulario = "CRIAR" | "EDITAR" | "REPOR";

export default function Home() {
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [precoCompra, setPrecoCompra] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  const [estoque, setEstoque] = useState("");

  const [itens, setItens] = useState<any[]>([]);
  const [categoriasDB, setCategoriasDB] = useState<any[]>([]); // Novo estado para as categorias do Firebase
  const [carregando, setCarregando] = useState(true);
  
  const [modo, setModo] = useState<ModoFormulario>("CRIAR");
  const [itemAtivo, setItemAtivo] = useState<any>(null);

  const [buscaCategoria, setBuscaCategoria] = useState("");
  const [buscaSubcategoria, setBuscaSubcategoria] = useState("");

  useEffect(() => {
    // Busca os Produtos
    const qProd = query(collection(db, "produtos"), orderBy("criadoEm", "desc"));
    const unsubProd = onSnapshot(qProd, (querySnapshot) => {
      const produtosFirestore: any[] = [];
      querySnapshot.forEach((documento) => {
        produtosFirestore.push({ id: documento.id, ...documento.data() });
      });
      setItens(produtosFirestore);
      setCarregando(false);
    });

    // Busca as Categorias cadastradas na nova página
    const qCat = query(collection(db, "categorias"), orderBy("nome", "asc"));
    const unsubCat = onSnapshot(qCat, (querySnapshot) => {
      const catArray: any[] = [];
      querySnapshot.forEach((documento) => {
        catArray.push({ id: documento.id, ...documento.data() });
      });
      setCategoriasDB(catArray);
    });

    return () => { unsubProd(); unsubCat(); };
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
    setBuscaCategoria("");
    setBuscaSubcategoria("");
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
          precoCompra: parseFloat(precoCompra),
          precoVenda: parseFloat(precoVenda),
          estoque: parseInt(estoque, 10),
          criadoEm: new Date()
        });
      } else if (modo === "EDITAR" && itemAtivo) {
        await updateDoc(doc(db, "produtos", itemAtivo.id), {
          nome,
          categoria: categoria || "Sem Categoria",
          subcategoria: subcategoria || "Sem Subcategoria",
          precoCompra: parseFloat(precoCompra),
          precoVenda: parseFloat(precoVenda),
          estoque: parseInt(estoque, 10),
        });
      } else if (modo === "REPOR" && itemAtivo) {
        const qtdComprada = parseInt(estoque, 10);
        const precoNovo = parseFloat(precoCompra);
        const novoEstoque = itemAtivo.estoque + qtdComprada;
        
        const custoTotalAtual = itemAtivo.estoque * itemAtivo.precoCompra;
        const custoNovaCompra = qtdComprada * precoNovo;
        const novoPrecoMedio = (custoTotalAtual + custoNovaCompra) / novoEstoque;

        await updateDoc(doc(db, "produtos", itemAtivo.id), {
          estoque: novoEstoque,
          precoCompra: novoPrecoMedio,
          precoVenda: parseFloat(precoVenda),
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
    setNome(item.nome);
    setCategoria(item.categoria || "");
    setSubcategoria(item.subcategoria || "");
    setPrecoCompra(""); 
    setPrecoVenda(item.precoVenda.toString());
    setEstoque(""); 
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

  // Filtros da tabela
  const categoriasTabelaUnicas = Array.from(new Set(itens.map(item => item.categoria).filter(Boolean)));
  const subcategoriasTabelaFiltradas = buscaCategoria 
    ? Array.from(new Set(itens.filter(item => item.categoria === buscaCategoria).map(item => item.subcategoria).filter(Boolean)))
    : [];

  const itensFiltrados = itens.filter(item => 
    (!buscaCategoria || item.categoria === buscaCategoria) &&
    (!buscaSubcategoria || item.subcategoria === buscaSubcategoria)
  );

  // Lógica para carregar as subcategorias no formulário baseado na categoria selecionada
  const categoriaSelecionadaObj = categoriasDB.find(cat => cat.nome === categoria);
  const subcategoriasDisponiveisForm = categoriaSelecionadaObj ? categoriaSelecionadaObj.subcategorias : [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 text-gray-800">
      <div className="max-w-7xl mx-auto">
        
        {/* Cabeçalho com o novo Botão */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Painel de Vendas</h1>
          <Link href="/categorias" className="mt-4 md:mt-0 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition font-medium text-sm">
            ⚙️ Gerenciar Categorias
          </Link>
        </div>

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
            
            {/* Filtro em Cascata para repor SKU */}
            {modo === "CRIAR" && itens.length > 0 && (
              <div className="md:col-span-6 mb-2 p-4 bg-blue-50 border border-blue-100 rounded-md">
                <label className="block text-sm font-medium text-blue-800 mb-3">
                  Já tem esse produto? Encontre para repor estoque:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-blue-600 mb-1">1. Escolha a Categoria</label>
                    <select
                      className="w-full p-2 border border-blue-300 rounded focus:ring-blue-500 bg-white text-gray-700"
                      value={buscaCategoria}
                      onChange={(e) => {
                        setBuscaCategoria(e.target.value);
                        setBuscaSubcategoria("");
                      }}
                    >
                      <option value="">Todas as Categorias</option>
                      {categoriasTabelaUnicas.map(cat => (
                        <option key={cat as string} value={cat as string}>{cat as string}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-blue-600 mb-1">2. Escolha a Subcategoria</label>
                    <select
                      className="w-full p-2 border border-blue-300 rounded focus:ring-blue-500 bg-white text-gray-700 disabled:opacity-50"
                      value={buscaSubcategoria}
                      onChange={(e) => setBuscaSubcategoria(e.target.value)}
                      disabled={!buscaCategoria}
                    >
                      <option value="">Todas as Subcategorias</option>
                      {subcategoriasTabelaFiltradas.map(sub => (
                        <option key={sub as string} value={sub as string}>{sub as string}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-blue-600 mb-1">3. Selecione o Produto (SKU)</label>
                    <select
                      className="w-full p-2 border border-blue-300 rounded focus:ring-blue-500 bg-white text-gray-700"
                      onChange={(e) => {
                        const selecionado = itens.find(i => i.id === e.target.value);
                        if (selecionado) {
                          iniciarReposicao(selecionado);
                          setBuscaCategoria("");
                          setBuscaSubcategoria("");
                        }
                      }}
                      value=""
                    >
                      <option value="" disabled>-- Clique para selecionar --</option>
                      {itensFiltrados.map(item => (
                        <option key={item.id} value={item.id}>{item.sku} - {item.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Linha 1: Dados do Produto */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={modo === "REPOR"}
                placeholder="Ex: Interruptor Tuya"
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 disabled:bg-gray-100 bg-white"
              />
            </div>
            
            {/* AGORA SÃO SELECTS PUXANDO DA NOVA BASE DE DADOS */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => {
                  setCategoria(e.target.value);
                  setSubcategoria(""); // Limpa subcategoria ao mudar categoria
                }}
                disabled={modo === "REPOR"}
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 disabled:bg-gray-100 bg-white"
              >
                <option value="">-- Selecione --</option>
                {categoriasDB.map(cat => (
                  <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                ))}
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Subcategoria</label>
              <select
                value={subcategoria}
                onChange={(e) => setSubcategoria(e.target.value)}
                disabled={modo === "REPOR" || !categoria}
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 disabled:bg-gray-100 bg-white"
              >
                <option value="">-- Selecione --</option>
                {subcategoriasDisponiveisForm.map((sub: string, index: number) => (
                  <option key={index} value={sub}>{sub}</option>
                ))}
              </select>
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

        {/* TABELA (Continua igual) */}
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
                        <button onClick={() => handleVender(item.id, item.estoque)} disabled={item.estoque <= 0} className="bg-gray-800 text-white px-2 py-1 rounded hover:bg-gray-700 disabled:opacity-30 text-xs font-semibold">Vender</button>
                        <button onClick={() => iniciarReposicao(item)} className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200 text-xs font-semibold">Repor</button>
                        <button onClick={() => iniciarEdicao(item)} className="bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 text-xs font-semibold">Editar</button>
                        <button onClick={() => handleExcluir(item.id)} className="text-red-500 hover:text-red-700 text-xs font-bold px-1">X</button>
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