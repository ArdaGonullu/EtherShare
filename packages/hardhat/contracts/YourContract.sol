// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

contract YourContract {

    struct File {
        uint256 id;
        string ipfsHash;
        string fileName;
        uint256 uploadTime;
        address uploader;
        uint256 price;
        uint256 downloadCount;
        bool isEncrypted; // YENİ: Şifreli mi?
        uint256 parentId; // YENİ: Hangi dosyanın devamı? (0 ise yeni dosya)
    }

    File[] public files;
    mapping(uint256 => mapping(address => bool)) public hasAccess;

    event FileUploaded(uint256 id, string ipfsHash, string fileName, uint256 price, address uploader, bool isEncrypted, uint256 parentId);
    event FilePurchased(uint256 id, address buyer, address seller, uint256 price);

    // YENİ PARAMETRELER EKLENDİ
    function uploadFile(
        string memory _ipfsHash, 
        string memory _fileName, 
        uint256 _price, 
        bool _isEncrypted, 
        uint256 _parentId
    ) public {
        uint256 newId = files.length;
        
        // Yeni dosyayı listeye ekle
        files.push(File(
            newId, 
            _ipfsHash, 
            _fileName, 
            block.timestamp, 
            msg.sender, 
            _price, 
            0,
            _isEncrypted,
            _parentId
        ));

        // Erişim izni ver
        hasAccess[newId][msg.sender] = true;

        emit FileUploaded(newId, _ipfsHash, _fileName, _price, msg.sender, _isEncrypted, _parentId);
    }

    function buyFile(uint256 _id) public payable {
        File storage file = files[_id];
        require(msg.value >= file.price, "Yetersiz bakiye");
        require(!hasAccess[_id][msg.sender], "Zaten satin aldiniz");

        payable(file.uploader).transfer(msg.value);
        hasAccess[_id][msg.sender] = true;
        file.downloadCount++;

        emit FilePurchased(_id, msg.sender, file.uploader, msg.value);
    }

    function getUserAccessList(address _user) public view returns (bool[] memory) {
        bool[] memory accessList = new bool[](files.length);
        for (uint i = 0; i < files.length; i++) {
            if (files[i].price == 0 || hasAccess[i][_user]) {
                accessList[i] = true;
            } else {
                accessList[i] = false;
            }
        }
        return accessList;
    }

    function getAllFiles() public view returns (File[] memory) {
        return files;
    }
}