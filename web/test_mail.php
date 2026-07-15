<?php
$para = "tu-correo-personal@gmail.com";
$titulo = "Prueba de envío";
$mensaje = "Si recibes esto, el correo de HostGator funciona bien.";
$cabeceras = "From: reservas@estadiasurbanas.com";

if(mail($para, $titulo, $mensaje, $cabeceras)){
    echo "Correo enviado correctamente.";
} else {
    echo "Fallo en el envío.";
}
?>