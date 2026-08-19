"use client";
import { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import Link from "next/link";

export default function GestaoCategorias() {
  const [nome, setNome] = useState("");
  const [subcategorias, setSubcategorias] = useState("");
  const [categorias, setCategorias] = useState<any[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Estados para Locais de Compra
  const [nomeLocal, setNomeLocal] = useState("");
  const [locais, setLocais] = useState<any[]>([]);

  // Estados para Canais de Venda
  const [nomeCanal, setNomeCanal] = useState("");
  const [canais, setCanais] = useState<any[]>([]);

  useEffect(() => {
    // Busca Categorias
    const qCat = query(collection(db, "categorias"), orderBy("nome", "asc"));
    const unsubCat = onSnapshot(qCat, (querySnapshot) => {
      const catArray: any[] = [];
      querySnapshot.forEach((doc) => catArray.push({ id: doc.id, ...doc.data() }));
      setCategorias(catArray);
    });

    // Busca Locais de Compra
    const qLocais = query(collection(db, "locais"), orderBy("nome", "asc"));
    const unsubLocais = onSnapshot(qLocais, (querySnapshot) => {
      const locaisArray: any[] = [];
      querySnapshot.forEach((doc) => locaisArray.push({ id: doc.id, ...doc.data() }));
      setLocais(locaisArray);
    });

    // Busca Canais de Venda
    const qCanais = query(collection(db, "canais"), orderBy("nome", "asc"));
    const unsubCanais = onSnapshot(qCanais, (querySnapshot) => {
      const canaisArray: any[] = [];
      querySnapshot.forEach((doc) => canaisArray.push({ id: doc.id, ...doc.data() }));
      setCanais(canaisArray);
    });

    return () => { unsubCat(); unsubLocais(); unsubCanais(); };
  }, []);

  const handleSalvarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) return;
    
    // Limpa as subcategorias digitadas
    const arraySubcategoriasNovas = subcategorias.split(",").map(sub => sub.trim()).filter(sub => sub.length > 0);
    
    try {
      if (editandoId) {
        // MODO EDIÇÃO: Atualiza a categoria específica que clicamos em "Editar"
        await updateDoc(doc(db, "categorias", editandoId), { 
          nome: nome.trim(), 
          subcategorias: arraySubcategoriasNovas 
        });
        setEditandoId(null);
      } else {
        // MODO CRIAÇÃO: Verifica se a categoria já existe (ignorando maiúsculas e minúsculas)
        const categoriaExistente = categorias.find(
          cat => cat.nome.toLowerCase() === nome.toLowerCase().trim()
        );

        if (categoriaExistente) {
          // SE JÁ EXISTE: Vamos fundir (merge) as subcategorias para não duplicar a categoria pai
          const subcategoriasAtuais = categoriaExistente.subcategorias || [];
          
          // O "Set" remove automaticamente nomes duplicados (ex: se colocar "Segurança" de novo, ele ignora)
          const subcategoriasFundidas = Array.from(new Set([...subcategoriasAtuais, ...arraySubcategoriasNovas]));
          
          await updateDoc(doc(db, "categorias", categoriaExistente.id), { 
            subcategorias: subcategoriasFundidas 
          });
        } else {
          // SE NÃO EXISTE: Cria uma categoria nova do zero
          await addDoc(collection(db, "categorias"), { 
            nome: nome.trim(), 
            subcategorias: arraySubcategoriasNovas 
          });
        }
      }
      // Limpa os campos
      setNome(""); 
      setSubcategorias("");
    } catch (error) { 
      console.error(error); 
    }
  };

  const handleSalvarLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeLocal) return;
    try {
      await addDoc(collection(db, "locais"), { nome: nomeLocal });
      setNomeLocal("");
    } catch (error) { console.error(error); }
  };

  const handleSalvarCanal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCanal) return;
    try {
      await addDoc(collection(db, "canais"), { nome: nomeCanal.toUpperCase() });
      setNomeCanal("");
    } catch (error) { console.error(error); }
  };

  const excluirLocal = async (id: string) => {
    if (window.confirm("Apagar este local de compra?")) await deleteDoc(doc(db, "locais", id));
  };
  const excluirCategoria = async (id: string) => {
    if (window.confirm("Apagar esta categoria?")) await deleteDoc(doc(db, "categorias", id));
  };
  const excluirCanal = async (id: string) => {
    if (window.confirm("Apagar este Canal de Venda?")) await deleteDoc(doc(db, "canais", id));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 text-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Configurações do Sistema</h1>
          <Link href="/" className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700 transition">← Voltar ao Painel</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* COLUNA 1: CATEGORIAS */}
          <div>
            <div className={`p-5 rounded-lg shadow-sm border mb-4 ${editandoId ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
              <h2 className="text-lg font-semibold mb-3">{editandoId ? "Editar Categoria" : "Nova Categoria"}</h2>
              <form onSubmit={handleSalvarCategoria} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Nome da Categoria</label>
                  {/* NOVO: Input com datalist (lista suspensa inteligente) */}
                  <input 
                    type="text" 
                    list="lista-categorias"
                    value={nome} 
                    onChange={(e) => setNome(e.target.value)} 
                    placeholder="Digite ou selecione..."
                    className="w-full p-2 border rounded focus:ring-blue-500 bg-white text-sm" 
                  />
                  <datalist id="lista-categorias">
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.nome} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Subcats (por vírgula)</label>
                  <input type="text" value={subcategorias} onChange={(e) => setSubcategorias(e.target.value)} className="w-full p-2 border rounded focus:ring-blue-500 bg-white text-sm" />
                </div>
                <button type="submit" className={`text-white px-4 py-2 rounded font-medium text-sm w-full ${editandoId ? 'bg-amber-500' : 'bg-blue-600'}`}>
                  {editandoId ? "Salvar Edição" : "Salvar Categoria"}
                </button>
              </form>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100">
                  <tr><th className="p-3 border-b font-semibold text-sm">Categorias</th><th className="p-3 border-b font-semibold text-center text-sm">Ações</th></tr>
                </thead>
                <tbody>
                  {categorias.map(cat => (
                    <tr key={cat.id} className="hover:bg-gray-50">
                      <td className="p-3 border-b">
                        <div className="font-medium text-sm">{cat.nome}</div>
                        <div className="text-[10px] text-gray-500 mt-1 leading-tight">{cat.subcategorias.join(", ")}</div>
                      </td>
                      <td className="p-3 border-b text-center space-x-2">
                        <button onClick={() => {setEditandoId(cat.id); setNome(cat.nome); setSubcategorias(cat.subcategorias.join(", "));}} className="text-blue-500 hover:text-blue-700 text-xs font-medium">Editar</button>
                        <button onClick={() => excluirCategoria(cat.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Excluir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* COLUNA 2: FORNECEDORES (Locais Compra) */}
          <div>
            <div className="p-5 rounded-lg shadow-sm border mb-4 bg-white">
              <h2 className="text-lg font-semibold mb-3">Locais de Compra</h2>
              <form onSubmit={handleSalvarLocal} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Fornecedor (AliExpress, Shopee...)</label>
                  <input type="text" value={nomeLocal} onChange={(e) => setNomeLocal(e.target.value)} className="w-full p-2 border rounded focus:ring-blue-500 bg-white text-sm" />
                </div>
                <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded font-medium text-sm w-full hover:bg-emerald-700">
                  Cadastrar Fornecedor
                </button>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100">
                  <tr><th className="p-3 border-b font-semibold text-sm">Locais Cadastrados</th><th className="p-3 border-b font-semibold text-center text-sm">Ações</th></tr>
                </thead>
                <tbody>
                  {locais.map(loc => (
                    <tr key={loc.id} className="hover:bg-gray-50">
                      <td className="p-3 border-b font-medium text-sm">{loc.nome}</td>
                      <td className="p-3 border-b text-center">
                        <button onClick={() => excluirLocal(loc.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Excluir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* COLUNA 3: CANAIS DE VENDA */}
          <div>
            <div className="p-5 rounded-lg shadow-sm border mb-4 bg-white">
              <h2 className="text-lg font-semibold mb-3">Canais de Anúncio</h2>
              <form onSubmit={handleSalvarCanal} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Sigla do Canal (ML, OLX, AMZ...)</label>
                  <input type="text" value={nomeCanal} onChange={(e) => setNomeCanal(e.target.value)} className="w-full p-2 border rounded focus:ring-blue-500 bg-white text-sm uppercase" />
                </div>
                <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded font-medium text-sm w-full hover:bg-purple-700">
                  Cadastrar Canal
                </button>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100">
                  <tr><th className="p-3 border-b font-semibold text-sm">Canais Ativos</th><th className="p-3 border-b font-semibold text-center text-sm">Ações</th></tr>
                </thead>
                <tbody>
                  {canais.map(canal => (
                    <tr key={canal.id} className="hover:bg-gray-50">
                      <td className="p-3 border-b font-bold text-sm text-purple-700">{canal.nome}</td>
                      <td className="p-3 border-b text-center">
                        <button onClick={() => excluirCanal(canal.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Excluir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}