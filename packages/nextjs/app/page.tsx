"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { parseEther, formatEther } from "viem";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useAccount } from "wagmi";

const Home: NextPage = () => {
  // ---------------------------------------------------------
  // 🔑 JWT KODUNU BURAYA YAPIŞTIR
  const PINATA_JWT = "buraya jwt kodu gelecek"; 
  // ---------------------------------------------------------

  const { address: connectedAddress } = useAccount();
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [priceInput, setPriceInput] = useState("0");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all"); 
  const [downloadingId, setDownloadingId] = useState<number | null>(null); // İndirme durumu

  // --- BLOKZİNCİR VERİLERİ ---
  const { writeContractAsync: uploadFileToChain } = useScaffoldWriteContract("YourContract");
  const { writeContractAsync: buyFileFromChain } = useScaffoldWriteContract("YourContract");
  
  const { data: files, refetch: refetchFiles } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getAllFiles",
  });

  const { data: accessList, refetch: refetchAccess } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getUserAccessList",
    args: [connectedAddress],
  });

  const refreshData = () => { refetchFiles(); refetchAccess(); };

  // --- ZORLA İNDİRME FONKSİYONU ---
  const downloadFile = async (url: string, filename: string, id: number) => {
    setDownloadingId(id);
    try {
      const response = await fetch(url);
      const blob = await response.blob(); // Dosyayı veri yumağına (blob) çevir
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Geçici bir link oluştur ve tıkla
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("İndirme hatası:", error);
      window.open(url, '_blank'); // Hata olursa eski yöntemle aç
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredFiles = files?.filter((file: any, index: number) => {
    const matchesSearch = file.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const isMine = file.uploader === connectedAddress;
    const canAccess = accessList ? accessList[index] : false; 

    if (!matchesSearch) return false;
    if (activeTab === "uploaded") return isMine;
    if (activeTab === "purchased") return canAccess && !isMine;
    return true;
  });

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return alert("Dosya seçmedin!");
    setUploading(true);
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append("file", file);
        const metadata = JSON.stringify({ name: file.name });
        formData.append("pinataMetadata", metadata);
        const options = JSON.stringify({ cidVersion: 0 });
        formData.append("pinataOptions", options);

        const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
          method: "POST",
          headers: { Authorization: `Bearer ${PINATA_JWT}` },
          body: formData,
        });
        const resData = await res.json();
        
        await uploadFileToChain({
          functionName: "uploadFile",
          args: [resData.IpfsHash, file.name, parseEther(priceInput)],
        });
      }
      alert("Yükleme tamamlandı! 🚀");
      setSelectedFiles(null);
      refreshData();
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
      alert("Satın alma başarılı! 🎉");
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 p-10 font-sans">
      <div className="text-center mb-10">
        <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400">
          EtherShare v3.0
        </h1>
        <p className="text-xl mt-4 text-gray-500">Gelişmiş Dosya Pazaryeri</p>
      </div>

      {/* YÜKLEME ALANI */}
      <div className="card bg-base-100 shadow-xl max-w-2xl mx-auto mb-10 border-dashed border-4 border-info p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">📤 Çoklu Dosya Yükle</h2>
        <input 
          type="file" 
          multiple 
          onChange={(e) => setSelectedFiles(e.target.files)}
          className="file-input file-input-bordered file-input-info w-full max-w-xs mx-auto" 
        />
        <div className="form-control w-full max-w-xs mx-auto mt-4">
          <label className="label"><span className="label-text">Fiyat (ETH)</span></label>
          <input 
            type="number" 
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            className="input input-bordered" 
            placeholder="0.0"
          />
        </div>
        <button 
          className={`btn btn-info mt-6 w-full max-w-xs mx-auto ${uploading ? "loading" : ""}`}
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading ? `Yükleniyor... (${selectedFiles?.length})` : "Pazara Ekle 🚀"}
        </button>
      </div>

      {/* SEKMELER & ARAMA */}
      <div className="flex flex-col md:flex-row justify-between items-center max-w-6xl mx-auto mb-6 gap-4">
        <div className="tabs tabs-boxed">
          <a className={`tab ${activeTab === "all" ? "tab-active" : ""}`} onClick={() => setActiveTab("all")}>🌎 Tümü</a>
          <a className={`tab ${activeTab === "uploaded" ? "tab-active" : ""}`} onClick={() => setActiveTab("uploaded")}>📤 Yüklediklerim</a>
          <a className={`tab ${activeTab === "purchased" ? "tab-active" : ""}`} onClick={() => setActiveTab("purchased")}>🎒 Satın Aldıklarım</a>
        </div>
        <input 
          type="text" 
          placeholder="🔍 Ara..." 
          className="input input-bordered w-full max-w-xs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* KARTLAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {filteredFiles?.map((file: any, index: number) => {
          const canAccess = accessList ? accessList[file.id] : false;
          const formattedPrice = formatEther(file.price);
          const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${file.ipfsHash}`;

          return (
            <div key={file.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-base-300">
              <figure className="bg-gray-100 h-32 flex items-center justify-center text-6xl">
                {file.fileName.endsWith(".pdf") ? "📕" : (file.fileName.match(/\.(jpeg|jpg|png|gif)$/) ? "🖼️" : "📁")}
              </figure>
              <div className="card-body">
                <h2 className="card-title justify-between text-sm">
                  {file.fileName.length > 18 ? file.fileName.substring(0, 16) + "..." : file.fileName}
                  {file.price === 0n ? 
                    <div className="badge badge-success text-white">ÜCRETSİZ</div> : 
                    <div className="badge badge-warning">{formattedPrice} ETH</div>
                  }
                </h2>
                <p className="text-xs text-gray-400 font-mono mt-2">Satıcı: {file.uploader.substring(0,6)}...</p>
                
                <div className="card-actions justify-end mt-4">
                  {canAccess ? (
                    <div className="flex gap-2 w-full">
                      {/* BUTON 1: AÇ (Yeni Sekme) */}
                      <a 
                        href={gatewayUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="btn btn-outline btn-sm btn-info flex-1"
                      >
                        Aç ↗
                      </a>
                      
                      {/* BUTON 2: İNDİR (Bilgisayara Kaydet) */}
                      <button 
                        onClick={() => downloadFile(gatewayUrl, file.fileName, Number(file.id))}
                        className={`btn btn-sm btn-success text-white flex-1 ${downloadingId === Number(file.id) ? "loading" : ""}`}
                      >
                        İndir ⬇
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="btn btn-warning w-full"
                      onClick={() => handleBuy(file.id, file.price)}
                    >
                      Satın Al 💸
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Home;