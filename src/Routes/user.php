<?php
use App\Controllers\userController;
use App\Config\responseHTTP;

$method = strtolower($_SERVER['REQUEST_METHOD']); //capturamos el metodo que se envia
$route = $_GET['route']; //capturamos la ruta 
$params = explode('/', $route); // hacemos un explode de route ya que si nos envian user/email/clave tendriamos un array 
$data = json_decode(file_get_contents("php://input"),true); //contendra la data que enviemos por cualquier metodo excepto el get, array asociativo 
$headers = getallheaders(); //capturando todas las cabeceras que nos envian


//print_r($route);
$app = new userController($method,$route,$params,$data,$headers); //instancia clase user controlador 
//$app->getAll('user/'); //getAll trearemos todos los usuarios registrados
//$app->post('user/'); //llamada al metodo post con la ruta al recurso
$app->getUser("user/{$params[1]}/"); //traemos la info de un usuario en particular
//$app->patchPassword("user/password/"); //metodo para actualizar la contraseña



//echo json_encode(responseHTTP::status404()); //imprimamos un error en caso de no encuentre la ruta

