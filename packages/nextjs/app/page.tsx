"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  // ---------------------------------------------------------
  // 1. AYARLAR: PINATA JWT KODUNU BURAYA YAPIŞTIR
  // (Gerçek projede bu .env dosyasında saklanır ama ödev için burası OK)
  const PINATA_JWT = "BURAYA_ANAHTAR_GELECEK"; 
  // ---------------------------------------------------------

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ipfsHash, setIpfsHash] = useState("");

  // 2. BLOKZİNCİR: Dosya yükleme fonksiyonunu hazırla
  const { writeContractAsync: uploadFileToChain } = useScaffoldWriteContract("YourContract");

  // 3. BLOKZİNCİR: Yüklenen dosyaları oku
  const { data: files } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getAllFiles",
  });

  // 4. FONKSİYON: Dosya Seçilince Çalışır
  const changeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  // 5. FONKSİYON: "Yükle" Butonuna Basınca Çalışır
  const handleSubmission = async () => {
    if (!selectedFile) return alert("Lütfen önce bir dosya seçin!");
    setUploading(true);

    try {
      // A) Dosyayı Pinata'ya (IPFS) Gönder
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      const metadata = JSON.stringify({ name: selectedFile.name });
      formData.append("pinataMetadata", metadata);

      const options = JSON.stringify({ cidVersion: 0 });
      formData.append("pinataOptions", options);

      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
        },
        body: formData,
      });

      const resData = await res.json();
      const fileHash = resData.IpfsHash;
      setIpfsHash(fileHash);
      console.log("IPFS Hash:", fileHash);

      // B) Hash Kodunu Blokzincire Kaydet (Metamask Açılır)
      await uploadFileToChain({
        functionName: "uploadFile",
        args: [fileHash, selectedFile.name],
      });

      alert("Başarılı! Dosya IPFS'e ve Blokzincire kaydedildi.");
      
    } catch (error) {
      console.error(error);
      alert("Bir hata oluştu. Konsola bakınız.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      
      {/* BAŞLIK KISMI */}
      <div className="px-5">
        <h1 className="text-center">
          <span className="block text-4xl font-bold">EtherShare 📂</span>
          <span className="block text-xl mt-2">Merkeziyetsiz Dosya Deposu</span>
        </h1>
      </div>

      {/* YÜKLEME KUTUSU */}
      <div className="card w-96 bg-base-100 shadow-xl mt-10 border-2 border-primary">
        <div className="card-body items-center text-center">
          <h2 className="card-title">Dosya Yükle</h2>
          
          <input 
            type="file" 
            onChange={changeHandler} 
            className="file-input file-input-bordered file-input-primary w-full max-w-xs" 
          />
          
          <div className="card-actions mt-5">
            <button 
              className={`btn btn-primary ${uploading ? "loading" : ""}`} 
              onClick={handleSubmission}
              disabled={uploading}
            >
              {uploading ? "IPFS'e Yükleniyor..." : "🚀 Blokzincire Kaydet"}
            </button>
          </div>
        </div>
      </div>

      {/* LİSTELEME KISMI */}
      <div className="mt-10 w-full max-w-4xl px-5">
        <h2 className="text-3xl font-bold mb-5 text-center">Son Yüklenen Dosyalar</h2>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>Dosya Adı</th>
                <th>Yükleyen (Cüzdan)</th>
                <th>İndir / Görüntüle</th>
              </tr>
            </thead>
            <tbody>
              {files?.map((file: any, index: number) => (
                <tr key={index} className="hover">
                  <th>{file.id.toString()}</th>
                  <td>{file.fileName}</td>
                  <td className="font-mono text-xs">{file.uploader}</td>
                  <td>
                    <a 
                      href={`https://gateway.pinata.cloud/ipfs/${file.ipfsHash}`} 
                      target="_blank" 
                      className="link link-primary"
                      rel="noreferrer"
                    >
                      Dosyayı Aç ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!files || files.length === 0) && (
            <div className="text-center mt-5 opacity-50">Henüz hiç dosya yüklenmemiş.</div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Home;