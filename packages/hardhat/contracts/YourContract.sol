// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

contract YourContract {

    struct File {
        uint256 id;
        string ipfsHash;
        string fileName;
        uint256 uploadTime;
        address uploader;
        uint256 price;      // YENİ: Dosya fiyatı (0 = Ücretsiz)
        uint256 downloadCount; // YENİ: İndirilme sayısı
    }

    File[] public files;
    
    // Satın alınan dosyaların takibi: DosyaID -> Cüzdan -> İzin Var mı?
    mapping(uint256 => mapping(address => bool)) public hasAccess;

    event FileUploaded(uint256 id, string ipfsHash, string fileName, uint256 price, address uploader);
    event FilePurchased(uint256 id, address buyer, address seller, uint256 price);

    // 1. DOSYA YÜKLEME (Fiyatlı)
    function uploadFile(string memory _ipfsHash, string memory _fileName, uint256 _price) public {
        uint256 newId = files.length;
        files.push(File(newId, _ipfsHash, _fileName, block.timestamp, msg.sender, _price, 0));
        
        // Yükleyen kişinin kendi dosyasına erişim izni olmalı
        hasAccess[newId][msg.sender] = true;
        
        emit FileUploaded(newId, _ipfsHash, _fileName, _price, msg.sender);
    }

    // 2. DOSYA SATIN ALMA
    function buyFile(uint256 _id) public payable {
        File storage file = files[_id];
        require(msg.value >= file.price, "Yetersiz bakiye");
        require(!hasAccess[_id][msg.sender], "Zaten satin aldiniz");

        // Parayı satıcıya gönder
        payable(file.uploader).transfer(msg.value);
        
        // İzni ver ve sayacı artır
        hasAccess[_id][msg.sender] = true;
        file.downloadCount++;

        emit FilePurchased(_id, msg.sender, file.uploader, msg.value);
    }

    // 3. ERİŞİM KONTROLÜ (Frontend için yardımcı)
    function checkAccess(uint256 _id, address _user) public view returns (bool) {
        if (files[_id].price == 0) return true; // Ücretsizse herkese açık
        return hasAccess[_id][_user]; // Değilse izne bak
    }

    function getAllFiles() public view returns (File[] memory) {
        return files;
    }
}