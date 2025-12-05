// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

contract YourContract {

    // 1. DOSYA KİMLİĞİ (STRUCT)
    // CryptoZombies'deki "Zombie" yapısı gibi, burada "File" yapımız var.
    struct File {
        uint256 id;             // Sıra numarası
        string ipfsHash;        // IPFS'teki adres (QmXoyp...)
        string fileName;        // Dosyanın adı (odev.pdf)
        uint256 uploadTime;     // Yüklenme zamanı
        address uploader;       // Yükleyen cüzdan adresi (msg.sender)
    }

    // 2. KAYIT DEFTERİ (ARRAY)
    // Tüm dosyaların saklandığı ana liste
    File[] public files;

    // 3. BİLDİRİM ZİLİ (EVENT)
    // Web sitesinin "Yeni dosya geldi!" diye duyması için
    event FileUploaded(uint256 id, string ipfsHash, string fileName, address uploader);

    // 4. DOSYA YÜKLEME FONKSİYONU
    // Frontend'den buraya Hash ve İsim gelecek
    function uploadFile(string memory _ipfsHash, string memory _fileName) public {
        
        uint256 newId = files.length; // Yeni numara ver (0, 1, 2...)

        // Listeye (Array) yeni dosyayı ekle
        files.push(File(
            newId,
            _ipfsHash,
            _fileName,
            block.timestamp, // Şu anki blok zamanı
            msg.sender       // Fonksiyonu çağıran kişi (Sen)
        ));

        // İşlem bitince zili çal
        emit FileUploaded(newId, _ipfsHash, _fileName, msg.sender);
    }

    // 5. TÜM DOSYALARI GETİR
    // Web sitesinde listelemek için yardımcı fonksiyon
    function getAllFiles() public view returns (File[] memory) {
        return files;
    }
}