"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function Home() {
  const [nome, setNome] = useState("");
  const [precoCompra, setPrecoCompra] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  const [estoque, setEstoque] = useState("");
  const [itens, setItens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  
  // Novo estado para controlar se estamos editando algum item
  const [editandoId, setEditandoId] = useState<string | null>(null);

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

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !precoCompra || !precoVenda || !estoque) return;

    try {
      if (editandoId) {
        // MODO EDIÇÃO: Atualiza o documento existente
        await updateDoc(doc(db, "produtos", editandoId), {
          nome,
          precoCompra: parseFloat(precoCompra),
          precoVenda: parseFloat(precoVenda),
          margem: parseFloat(precoVenda) - parseFloat(precoCompra),
          estoque: parseInt(estoque, 10),
        });
        
        // Limpa o estado de edição
        setEditandoId(null);
      } else {
        // MODO CRIAÇÃO: Adiciona um novo documento
        await addDoc(collection(db, "produtos"), {
          nome,
          sku: gerarSKU(nome),
          precoCompra: parseFloat(precoCompra),
          precoVenda: parseFloat(precoVenda),
          margem: parseFloat(precoVenda) - parseFloat(precoCompra),
          estoque: parseInt(estoque, 10),
          criadoEm: new Date()
        });
      }

      // Limpa os campos do formulário em ambos os casos
      setNome("");
      setPrecoCompra("");
      setPrecoVenda("");
      setEstoque("");
    } catch (error) {
      console.error("Erro ao salvar documento: ", error);
      alert("Erro ao salvar o produto.");
    }
  };

  // Preenche o formulário com os dados do item selecionado
  const iniciarEdicao = (item: any) => {
    setEditandoId(item.id);
    setNome(item.nome);
    setPrecoCompra(item.precoCompra.toString());
    setPrecoVenda(item.precoVenda.toString());
    setEstoque(item.estoque.toString());
    
    // Rola a página suavemente para o topo para mostrar o formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setNome("");
    setPrecoCompra("");
    setPrecoVenda("");
    setEstoque("");
  };

  const handleVender = async (id: string, estoqueAtual: number) => {
    if (estoqueAtual <= 0) {
      alert("Este produto já está sem estoque!");
      return;
    }

    try {
      await updateDoc(doc(db, "produtos", id), {
        estoque: estoqueAtual - 1
      });
    } catch (error) {
      console.error("Erro ao atualizar estoque: ", error);
      alert("Erro ao registrar a venda.");
    }
  };

  const handleExcluir = async (id: string) => {
    const confirmar = window.confirm("Tem certeza que deseja apagar este produto?");
    if (confirmar) {
      try {
        await deleteDoc(doc(db, "produtos", id));
        // Se o usuário apagar o item que estava editando no momento, cancelamos a edição
        if (editandoId === id) cancelarEdicao();
      } catch (error) {
        console.error("Erro ao excluir documento: ", error);
        alert("Erro ao excluir o produto.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-gray-800">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Painel de Vendas</h1>

        {/* Formulário de Cadastro / Edição */}
        <div className={`p-6 rounded-lg shadow-sm border mb-8 transition-colors ${editandoId ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            {editandoId ? "Editar Produto" : "Cadastrar Novo Item"}
          </h2>
          <form onSubmit={handleSalvar} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Interruptor Inteligente Tuya"
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compra (R$)</label>
              <input
                type="number"
                step="0.01"
                value={precoCompra}
                onChange={(e) => setPrecoCompra(e.target.value)}
                placeholder="45.00"
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Venda (R$)</label>
              <input
                type="number"
                step="0.01"
                value={precoVenda}
                onChange={(e) => setPrecoVenda(e.target.value)}
                placeholder="120.00"
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estoque</label>
              <input
                type="number"
                step="1"
                value={estoque}
                onChange={(e) => setEstoque(e.target.value)}
                placeholder="Ex: 10"
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>
            <div className="md:col-span-5 mt-2 flex gap-3">
              <button
                type="submit"
                className={`${editandoId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-2 rounded transition w-full md:w-auto font-medium`}
              >
                {editandoId ? "Salvar Alterações" : "Adicionar Produto"}
              </button>
              
              {/* Botão de cancelar só aparece quando estamos editando */}
              {editandoId && (
                <button
                  type="button"
                  onClick={cancelarEdicao}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition w-full md:w-auto font-medium"
                >
                  Cancelar Edição
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Tabela de Produtos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 border-b font-semibold">SKU</th>
                <th className="p-4 border-b font-semibold">Produto</th>
                <th className="p-4 border-b font-semibold">Estoque</th>
                <th className="p-4 border-b font-semibold">Compra</th>
                <th className="p-4 border-b font-semibold">Venda</th>
                <th className="p-4 border-b font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    Carregando produtos do Firebase...
                  </td>
                </tr>
              ) : itens.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    Nenhum produto cadastrado ainda.
                  </td>
                </tr>
              ) : (
                itens.map((item) => (
                  <tr key={item.id} className={`hover:bg-gray-50 ${item.estoque <= 0 ? 'bg-red-50 opacity-70' : ''} ${editandoId === item.id ? 'bg-blue-50/50' : ''}`}>
                    <td className="p-4 border-b font-mono text-sm text-blue-600">{item.sku}</td>
                    <td className="p-4 border-b">{item.nome}</td>
                    <td className="p-4 border-b font-bold text-gray-800">
                      {item.estoque > 0 ? (
                        <span>{item.estoque} un.</span>
                      ) : (
                        <span className="text-red-500 text-sm">Esgotado</span>
                      )}
                    </td>
                    <td className="p-4 border-b text-red-600">R$ {item.precoCompra.toFixed(2)}</td>
                    <td className="p-4 border-b text-green-600">R$ {item.precoVenda.toFixed(2)}</td>
                    <td className="p-4 border-b text-center space-x-3">
                      <button
                        onClick={() => handleVender(item.id, item.estoque)}
                        disabled={item.estoque <= 0}
                        className="bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                        title="Vender 1 unidade"
                      >
                        Vender
                      </button>
                      <button
                        onClick={() => iniciarEdicao(item)}
                        className="text-blue-500 hover:text-blue-700 font-medium text-sm transition"
                        title="Editar item"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleExcluir(item.id)}
                        className="text-red-500 hover:text-red-700 font-medium text-sm transition"
                        title="Excluir item"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}