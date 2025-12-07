"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { parseEther, formatEther } from "viem";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useAccount } from "wagmi";
import CryptoJS from "crypto-js";

const Home: NextPage = () => {
  // ---------------------------------------------------------
  // 🔑 JWT KODUNU BURAYA YAPIŞTIR
  const PINATA_JWT = "Buraya jwt kodu gelecek"; 
  // ---------------------------------------------------------

  const { address: connectedAddress } = useAccount();
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [priceInput, setPriceInput] = useState("0");
  const [passwordInput, setPasswordInput] = useState(""); 
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [processingId, setProcessingId] = useState<number | null>(null);
  
  // YENİ: Versiyonlama için durum
  const [updatingFileId, setUpdatingFileId] = useState<number | null>(null); // Hangi dosyayı güncelliyoruz?

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

  // --- YÜKLEME (GÜNCELLEME DESTEKLİ) ---
  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return alert("Dosya seçmedin!");
    setUploading(true);

    try {
      // Eğer güncelleme yapılıyorsa sadece tek dosya izin verelim (Basitlik için)
      if (updatingFileId !== null && selectedFiles.length > 1) {
        alert("Güncelleme yaparken sadece 1 dosya seçebilirsin!");
        setUploading(false);
        return;
      }

      for (let i = 0; i < selectedFiles.length; i++) {
        let fileToUpload = selectedFiles[i];
        let isEncrypted = false;

        // Şifreleme
        if (passwordInput.trim() !== "") {
            const arrayBuffer = await fileToUpload.arrayBuffer();
            const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer as any);
            const encrypted = CryptoJS.AES.encrypt(wordArray, passwordInput).toString();
            const blob = new Blob([encrypted], { type: "text/plain" });
            fileToUpload = new File([blob], fileToUpload.name + ".enc", { type: "text/plain" });
            isEncrypted = true;
        }

        // Pinata Upload
        const formData = new FormData();
        formData.append("file", fileToUpload);
        const metadata = JSON.stringify({ name: fileToUpload.name });
        formData.append("pinataMetadata", metadata);
        const options = JSON.stringify({ cidVersion: 0 });
        formData.append("pinataOptions", options);

        const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
          method: "POST",
          headers: { Authorization: `Bearer ${PINATA_JWT}` },
          body: formData,
        });
        const resData = await res.json();
        
        // Blokzincir Kaydı
        // EĞER GÜNCELLEME İSE -> parentId = updatingFileId
        // EĞER YENİ İSE -> parentId = 0
        const parentId = updatingFileId !== null ? BigInt(updatingFileId) : 0n;

        await uploadFileToChain({
          functionName: "uploadFile",
          args: [resData.IpfsHash, selectedFiles[i].name, parseEther(priceInput), isEncrypted, parentId],
        });
      }
      
      alert(updatingFileId !== null ? "Dosya güncellendi! ♻️" : "Yükleme tamamlandı! 🚀");
      
      // Temizlik
      setSelectedFiles(null);
      setPasswordInput("");
      setUpdatingFileId(null); // Güncelleme modundan çık
      refreshData();

    } catch (e) {
      console.error(e);
      alert("Hata oluştu.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: any) => {
    setProcessingId(Number(file.id));
    try {
      const url = `https://gateway.pinata.cloud/ipfs/${file.ipfsHash}`;
      const response = await fetch(url);
      let blob;
      let filename = file.fileName;

      if (file.isEncrypted) {
        const password = prompt(`🔒 "${file.fileName}" şifreli. Parola:`);
        if (!password) { setProcessingId(null); return; }

        const encryptedText = await response.text();
        try {
            const decrypted = CryptoJS.AES.decrypt(encryptedText, password);
            const u8 = Uint8Array.from(atob(decrypted.toString(CryptoJS.enc.Base64)).split('').map(c => c.charCodeAt(0)));
            blob = new Blob([u8], { type: "application/octet-stream" });
            // Şifreli dosyanın uzantısındaki .enc kısmını temizleyelim
            filename = filename.replace(".enc", ""); 
        } catch (err) {
            alert("❌ Yanlış parola!");
            setProcessingId(null);
            return;
        }
      } else {
        blob = await response.blob();
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

    } catch (error) {
      console.error("Hata:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleBuy = async (fileId: bigint, price: bigint) => {
    try {
      await buyFileFromChain({ functionName: "buyFile", args: [fileId], value: price });
      alert("Satın alma başarılı!");
      refreshData();
    } catch (e) { console.error(e); }
  };

  // FİLTRELEME
  const filteredFiles = files?.filter((file: any, index: number) => {
    const matchesSearch = file.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const isMine = file.uploader === connectedAddress;
    const canAccess = accessList ? accessList[index] : false;
    
    if (!matchesSearch) return false;
    if (activeTab === "uploaded") return isMine;
    if (activeTab === "purchased") return canAccess && !isMine;
    return true;
  });

  return (
    <div className="min-h-screen bg-base-200 p-10 font-sans">
      <div className="text-center mb-10">
        <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
          EtherShare v4.1
        </h1>
        <p className="text-xl mt-4 text-gray-500">
          {updatingFileId !== null ? `♻️ Dosya #${updatingFileId} Güncelleniyor...` : "Şifreli & Versiyonlu Dosya Platformu"}
        </p>
        
        {/* Güncelleme İptal Butonu */}
        {updatingFileId !== null && (
            <button className="btn btn-sm btn-error mt-2" onClick={() => setUpdatingFileId(null)}>
                İptal Et ve Normal Yüklemeye Dön
            </button>
        )}
      </div>

      {/* YÜKLEME KUTUSU (Rengi duruma göre değişir) */}
      <div className={`card bg-base-100 shadow-xl max-w-2xl mx-auto mb-10 border-dashed border-4 ${updatingFileId !== null ? 'border-warning' : 'border-success'} p-8 text-center`}>
        <h2 className="text-2xl font-bold mb-4">
            {updatingFileId !== null ? `♻️ Dosyanın Yeni Versiyonunu Seç` : "📤 Güvenli Dosya Yükle"}
        </h2>
        
        <input type="file" multiple={updatingFileId === null} onChange={(e) => setSelectedFiles(e.target.files)} className={`file-input file-input-bordered ${updatingFileId !== null ? 'file-input-warning' : 'file-input-success'} w-full max-w-xs mx-auto mb-4`} />
        
        <div className="flex gap-4 max-w-xs mx-auto">
          <div className="form-control flex-1">
            <label className="label"><span className="label-text">Fiyat (ETH)</span></label>
            <input type="number" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} className="input input-bordered" placeholder="0.0" />
          </div>
          <div className="form-control flex-1">
            <label className="label"><span className="label-text">Parola (İsteğe Bağlı)</span></label>
            <input type="text" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="input input-bordered input-warning" placeholder="🔒 1234" />
          </div>
        </div>

        <button className={`btn ${updatingFileId !== null ? 'btn-warning' : 'btn-success'} mt-6 w-full max-w-xs mx-auto ${uploading ? "loading" : ""}`} onClick={handleUpload} disabled={uploading}>
          {uploading ? `İşleniyor...` : (updatingFileId !== null ? "♻️ Versiyonu Güncelle" : (passwordInput ? "🔒 Şifrele ve Yükle" : "🚀 Yükle"))}
        </button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center max-w-6xl mx-auto mb-6 gap-4">
        <div className="tabs tabs-boxed">
          <a className={`tab ${activeTab === "all" ? "tab-active" : ""}`} onClick={() => setActiveTab("all")}>🌎 Tümü</a>
          <a className={`tab ${activeTab === "uploaded" ? "tab-active" : ""}`} onClick={() => setActiveTab("uploaded")}>📤 Yüklediklerim</a>
          <a className={`tab ${activeTab === "purchased" ? "tab-active" : ""}`} onClick={() => setActiveTab("purchased")}>🎒 Satın Aldıklarım</a>
        </div>
        <input type="text" placeholder="🔍 Ara..." className="input input-bordered w-full max-w-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {filteredFiles?.map((file: any) => {
          const canAccess = accessList ? accessList[file.id] : false;
          const formattedPrice = formatEther(file.price);
          const isProcessing = processingId === Number(file.id);
          const isMine = file.uploader === connectedAddress;
          const parentId = Number(file.parentId);

          return (
            <div key={file.id} className={`card bg-base-100 shadow-xl border ${file.isEncrypted ? 'border-warning' : 'border-base-300'}`}>
              <figure className="bg-gray-100 h-32 flex items-center justify-center text-6xl relative">
                {file.isEncrypted ? "🔒" : (file.fileName.endsWith(".pdf") ? "📕" : "📄")}
                {file.isEncrypted && <div className="absolute top-2 right-2 badge badge-warning">ŞİFRELİ</div>}
                {parentId > 0 && <div className="absolute top-2 left-2 badge badge-info">v2.0</div>}
              </figure>
              <div className="card-body">
                <h2 className="card-title justify-between text-sm">
                  {file.fileName.length > 15 ? file.fileName.substring(0, 13) + "..." : file.fileName}
                  {file.price === 0n ? <div className="badge badge-success text-white">ÜCRETSİZ</div> : <div className="badge badge-warning">{formattedPrice} ETH</div>}
                </h2>
                
                {parentId > 0 && <p className="text-xs text-info font-bold">↳ Dosya #{parentId} Güncellemesi</p>}
                <p className="text-xs text-gray-400 font-mono mt-1">ID: #{Number(file.id)} | Satıcı: {file.uploader.substring(0,6)}...</p>
                
                <div className="card-actions justify-end mt-4 flex-col gap-2">
                  {canAccess ? (
                    <div className="flex gap-2 w-full">
                      {/* GÖRÜNTÜLE (Sadece Şifresizse) */}
                      {!file.isEncrypted && (
                          <a 
                            href={`https://gateway.pinata.cloud/ipfs/${file.ipfsHash}`} 
                            target="_blank" rel="noreferrer"
                            className="btn btn-outline btn-sm btn-info flex-1"
                          >
                            👁 Aç
                          </a>
                      )}
                      
                      {/* İNDİR / ŞİFRE ÇÖZ */}
                      <button 
                        onClick={() => handleDownload(file)}
                        className={`btn btn-sm ${file.isEncrypted ? 'btn-warning' : 'btn-success text-white'} flex-1 ${isProcessing ? "loading" : ""}`}
                      >
                        {file.isEncrypted ? "🔓 Çöz" : "⬇ İndir"}
                      </button>
                    </div>
                  ) : (
                    <button className="btn btn-warning w-full" onClick={() => handleBuy(file.id, file.price)}>
                      Satın Al 💸
                    </button>
                  )}

                  {/* VERSİYON GÜNCELLEME BUTONU (Sadece Benimse) */}
                  {isMine && (
                    <button 
                        className="btn btn-xs btn-ghost w-full border-t border-base-200 mt-2"
                        onClick={() => {
                            setUpdatingFileId(Number(file.id));
                            window.scrollTo({ top: 0, behavior: 'smooth' }); // Yukarı kaydır
                        }}
                    >
                        ♻️ Yeni Versiyon Yükle
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