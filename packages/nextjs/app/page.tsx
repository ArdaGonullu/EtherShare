"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  // ---------------------------------------------------------
  // JWT KODUNU BURAYA GERİ YAPIŞTIR
  const PINATA_JWT = "buraya jwt kodu gelecek";
  // ---------------------------------------------------------

  const { address: connectedAddress } = useAccount();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [priceInput, setPriceInput] = useState("0");

  // YENİ: Arama ve Sekme (Tab) Durumları
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' veya 'mine'

  // --- BLOKZİNCİR BAĞLANTILARI ---
  const { writeContractAsync: uploadFileToChain } = useScaffoldWriteContract("YourContract");
  const { writeContractAsync: buyFileFromChain } = useScaffoldWriteContract("YourContract");

  const { data: files } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getAllFiles",
  });

  // --- YENİ: FİLTRELEME MANTIĞI ---
  const filteredFiles = files?.filter((file: any) => {
    // 1. Arama Filtresi
    const matchesSearch = file.fileName.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Sekme Filtresi (Tümü mü? Benimkiler mi?)
    const matchesTab = activeTab === "all" ? true : file.uploader === connectedAddress;

    return matchesSearch && matchesTab;
  });

  const handleUpload = async () => {
    if (!selectedFile) return alert("Dosya seçmedin!");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const metadata = JSON.stringify({ name: selectedFile.name });
      formData.append("pinataMetadata", metadata);
      const options = JSON.stringify({ cidVersion: 0 });
      formData.append("pinataOptions", options);

      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: { Authorization: `Bearer ${PINATA_JWT}` },
        body: formData,
      });
      const resData = await res.json();
      const fileHash = resData.IpfsHash;

      await uploadFileToChain({
        functionName: "uploadFile",
        args: [fileHash, selectedFile.name, parseEther(priceInput)],
      });
      alert("Dosya pazara eklendi! 🛒");
      setSelectedFile(null); // Yükleme bitince seçimi temizle
    } catch (e) {
      console.error(e);
      alert("Hata oluştu.");
    } finally {
      setUploading(false);
    }
  };

  const handleBuy = async (fileId: bigint, price: bigint) => {
    try {
      await buyFileFromChain({
        functionName: "buyFile",
        args: [fileId],
        value: price,
      });
      alert("Satın alma başarılı! Dosyayı indirebilirsin. 🎉");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 p-10 font-sans">
      <div className="text-center mb-10">
        <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          EtherShare v2.1
        </h1>
        <p className="text-xl mt-4 text-gray-500">Merkeziyetsiz Dosya Pazaryeri</p>
      </div>

      {/* --- YÜKLEME ALANI --- */}
      <div className="card bg-base-100 shadow-xl max-w-2xl mx-auto mb-10 border-dashed border-4 border-primary p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">📤 Dosya Satışa Çıkar</h2>
        <input
          type="file"
          onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)}
          className="file-input file-input-bordered file-input-primary w-full max-w-xs mx-auto"
        />
        <div className="form-control w-full max-w-xs mx-auto mt-4">
          <label className="label">
            <span className="label-text">Fiyat (ETH)</span>
          </label>
          <input
            type="number"
            value={priceInput}
            onChange={e => setPriceInput(e.target.value)}
            className="input input-bordered"
            placeholder="0.0"
          />
        </div>
        <button
          className={`btn btn-primary mt-6 w-full max-w-xs mx-auto ${uploading ? "loading" : ""}`}
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading ? "IPFS'e Gönderiliyor..." : "Pazara Ekle 🚀"}
        </button>
      </div>

      {/* --- YENİ: ARAMA VE SEKMELER --- */}
      <div className="flex flex-col md:flex-row justify-between items-center max-w-6xl mx-auto mb-6 gap-4">
        {/* Sekmeler (Tabs) */}
        <div className="tabs tabs-boxed">
          <a className={`tab ${activeTab === "all" ? "tab-active" : ""}`} onClick={() => setActiveTab("all")}>
            🌎 Tüm Dosyalar
          </a>
          <a className={`tab ${activeTab === "mine" ? "tab-active" : ""}`} onClick={() => setActiveTab("mine")}>
            👤 Dosyalarım
          </a>
        </div>

        {/* Arama Kutusu */}
        <input
          type="text"
          placeholder="🔍 Dosya adı ara..."
          className="input input-bordered w-full max-w-xs"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* --- DOSYA KARTLARI --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {filteredFiles?.map((file: any) => {
          const isFree = file.price === 0n;
          const isMine = file.uploader === connectedAddress;
          const formattedPrice = formatEther(file.price);

          return (
            <div
              key={file.id}
              className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-base-300"
            >
              <figure className="bg-gray-100 h-32 flex items-center justify-center text-6xl">
                {file.fileName.endsWith(".pdf") ? "📕" : "🖼️"}
              </figure>
              <div className="card-body">
                <h2 className="card-title justify-between text-sm">
                  {file.fileName.length > 20 ? file.fileName.substring(0, 18) + "..." : file.fileName}
                  {isFree ? (
                    <div className="badge badge-success text-white">ÜCRETSİZ</div>
                  ) : (
                    <div className="badge badge-warning">{formattedPrice} ETH</div>
                  )}
                </h2>

                <p className="text-xs text-gray-400 font-mono mt-2">
                  Satıcı: {file.uploader.substring(0, 6)}...{file.uploader.substring(38)}
                </p>

                <div className="card-actions justify-end mt-4">
                  {isMine || isFree ? (
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${file.ipfsHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline btn-success w-full"
                    >
                      Dosyayı Aç / İndir ⬇️
                    </a>
                  ) : (
                    <button className="btn btn-warning w-full" onClick={() => handleBuy(file.id, file.price)}>
                      Satın Al ({formattedPrice} ETH) 💸
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {(!filteredFiles || filteredFiles.length === 0) && (
          <div className="col-span-full text-center py-10 opacity-50">Aradığınız kriterde dosya bulunamadı... 🕵️‍♂️</div>
        )}
      </div>
    </div>
  );
};

export default Home;
