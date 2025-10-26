<?php
    use App\Config\errorlogs;
    use App\Config\responseHTTP;
    use App\Config\Security;
    require dirname(__DIR__).'\vendor\autoload.php';
    //print_r($_POST);
    //print_r($_GET);
   
    $url = explode('/',$_GET['route']);
    
    $lista = ['auth', 'user', 'login', 'index', 'pedidos', 'ventas', 'gestion_usu', 'inve', 'firebase', 'perfil', 'register', 'upload']; // lista de rutas permitidas
    $caso = filter_input(INPUT_GET, "caso");
    $file = "";
    if($caso != ""){
        $file = dirname(__DIR__) . '/src/Routes/' . $url[0] . '.php'; 
    }else{
        $file = dirname(__DIR__) . '/src/Views/PHP/' . $url[0] . '.php';   
    }
    
    errorlogs::activa_error_logs(); //activamos los errors    
    //echo $_GET['route'];
    if(isset($_GET['route'])){
        if(!in_array($url[0], $lista)){
            //echo "La ruta no existe";
            echo json_encode(responseHTTP::status200('Dentro!'));
            //error_log("Esto es una prueba de error...");
           //header(‘HTTP/1.1 404 Not Found’);
            exit; //finalizamos la ejecución
        }  
        
        //validamos que el archivo exista y que es legible
        if(!file_exists($file) || !is_readable($file)){
            //echo "El archivo no existe o no es legible";
            echo json_encode(responseHTTP::status200('El archivo no existe o no es legible!'));
            //error_log("Esto es una prueba de error...");
        }else{
            require $file;
            exit;
        }

        //echo "existe la variable route";
    }else{
        echo "no existe la variable route";
    }

?>