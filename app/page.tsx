"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function Home() {
  const [nome, setNome] = useState("");
  const [precoCompra, setPrecoCompra] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  const [itens, setItens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Puxar os dados em tempo real do Firebase
  useEffect(() => {
    const q = query(collection(db, "produtos"), orderBy("criadoEm", "desc"));
    
    // onSnapshot escuta o banco em tempo real
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const produtosFirestore: any[] = [];
      querySnapshot.forEach((doc) => {
        produtosFirestore.push({ id: doc.id, ...doc.data() });
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

  const handleAdicionar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !precoCompra || !precoVenda) return;

    try {
      // Salvar no Firebase em vez de apenas localmente
      await addDoc(collection(db, "produtos"), {
        nome,
        sku: gerarSKU(nome),
        precoCompra: parseFloat(precoCompra),
        precoVenda: parseFloat(precoVenda),
        margem: parseFloat(precoVenda) - parseFloat(precoCompra),
        criadoEm: new Date()
      });

      // Limpar formulário
      setNome("");
      setPrecoCompra("");
      setPrecoVenda("");
    } catch (error) {
      console.error("Erro ao adicionar documento: ", error);
      alert("Erro ao salvar o produto.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-gray-800">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Painel de Vendas</h1>

        {/* Formulário de Cadastro */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold mb-4">Cadastrar Novo Item</h2>
          <form onSubmit={handleAdicionar} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Interruptor Inteligente Tuya"
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço de Compra (R$)</label>
              <input
                type="number"
                step="0.01"
                value={precoCompra}
                onChange={(e) => setPrecoCompra(e.target.value)}
                placeholder="Ex: 45.00"
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço de Venda (R$)</label>
              <input
                type="number"
                step="0.01"
                value={precoVenda}
                onChange={(e) => setPrecoVenda(e.target.value)}
                placeholder="Ex: 120.00"
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-4 mt-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition w-full md:w-auto"
              >
                Adicionar Produto e Gerar SKU
              </button>
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
                <th className="p-4 border-b font-semibold">Compra</th>
                <th className="p-4 border-b font-semibold">Venda</th>
                <th className="p-4 border-b font-semibold">Lucro (Bruto)</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    Carregando produtos do Firebase...
                  </td>
                </tr>
              ) : itens.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    Nenhum produto cadastrado ainda.
                  </td>
                </tr>
              ) : (
                itens.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="p-4 border-b font-mono text-sm text-blue-600">{item.sku}</td>
                    <td className="p-4 border-b">{item.nome}</td>
                    <td className="p-4 border-b text-red-600">R$ {item.precoCompra.toFixed(2)}</td>
                    <td className="p-4 border-b text-green-600">R$ {item.precoVenda.toFixed(2)}</td>
                    <td className="p-4 border-b font-medium">R$ {item.margem.toFixed(2)}</td>
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