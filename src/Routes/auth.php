<?php
//echo "Hola";
use App\Config\Security;
//echo json_encode(Security::secretKey());
//echo json_encode(Security::createPassword("hola"));
$pass = Security::createPassword("hola");
//echo json_encode(Security::validatePassword("hola",$pass));


echo json_encode(Security::createTokenJwt(Security::secretKey(),["hola"]));


use App\DB\connectionDB;
connectionDB::getConnection();