"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase"; // Note os dois pontos para voltar duas pastas
import Link from "next/link";

export default function GestaoCategorias() {
  const [nome, setNome] = useState("");
  const [subcategorias, setSubcategorias] = useState("");
  const [categorias, setCategorias] = useState<any[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "categorias"), orderBy("nome", "asc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const catArray: any[] = [];
      querySnapshot.forEach((doc) => catArray.push({ id: doc.id, ...doc.data() }));
      setCategorias(catArray);
    });
    return () => unsubscribe();
  }, []);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) return;

    // Transforma o texto separado por vírgulas em um array limpo
    const arraySubcategorias = subcategorias
      .split(",")
      .map(sub => sub.trim())
      .filter(sub => sub.length > 0);

    try {
      if (editandoId) {
        await updateDoc(doc(db, "categorias", editandoId), {
          nome,
          subcategorias: arraySubcategorias
        });
        setEditandoId(null);
      } else {
        await addDoc(collection(db, "categorias"), {
          nome,
          subcategorias: arraySubcategorias
        });
      }
      setNome("");
      setSubcategorias("");
    } catch (error) {
      console.error("Erro ao salvar categoria: ", error);
    }
  };

  const editar = (cat: any) => {
    setEditandoId(cat.id);
    setNome(cat.nome);
    setSubcategorias(cat.subcategorias.join(", "));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const excluir = async (id: string) => {
    if (window.confirm("Deseja mesmo apagar esta categoria?")) {
      await deleteDoc(doc(db, "categorias", id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 text-gray-800">
      <div className="max-w-4xl mx-auto">
        {/* Navegação entre páginas */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Gestão de Categorias</h1>
          <Link href="/" className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700 transition">
            ← Voltar ao Painel
          </Link>
        </div>

        {/* Formulário */}
        <div className={`p-6 rounded-lg shadow-sm border mb-8 ${editandoId ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
          <h2 className="text-xl font-semibold mb-4">
            {editandoId ? "Editar Categoria" : "Nova Categoria"}
          </h2>
          <form onSubmit={handleSalvar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome da Categoria</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Smart Home"
                className="w-full p-2 border rounded focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Subcategorias (separe por vírgula)</label>
              <input
                type="text"
                value={subcategorias}
                onChange={(e) => setSubcategorias(e.target.value)}
                placeholder="Ex: Iluminação, Segurança, Sensores"
                className="w-full p-2 border rounded focus:ring-blue-500 bg-white"
              />
            </div>
            <div className="md:col-span-2 mt-2">
              <button type="submit" className={`text-white px-6 py-2 rounded font-medium ${editandoId ? 'bg-amber-500' : 'bg-blue-600'}`}>
                {editandoId ? "Salvar Alterações" : "Criar Categoria"}
              </button>
              {editandoId && (
                <button type="button" onClick={() => { setEditandoId(null); setNome(""); setSubcategorias(""); }} className="ml-3 text-gray-600">
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Lista de Categorias */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 border-b font-semibold">Categoria</th>
                <th className="p-4 border-b font-semibold">Subcategorias</th>
                <th className="p-4 border-b font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="p-4 border-b font-medium">{cat.nome}</td>
                  <td className="p-4 border-b text-gray-600">
                    {cat.subcategorias.join(", ") || <span className="text-gray-400">Nenhuma</span>}
                  </td>
                  <td className="p-4 border-b text-center space-x-3">
                    <button onClick={() => editar(cat)} className="text-blue-500 hover:text-blue-700 text-sm font-medium">Editar</button>
                    <button onClick={() => excluir(cat.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}