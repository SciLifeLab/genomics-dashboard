<?php
if($_SERVER['REQUEST_URI']!='/Application/'){
    $appname=explode('/', $_SERVER['REQUEST_URI']);
    $location="http://".$_SERVER['HTTP_HOST']."/".$appname[1]."/dashboard_all.php?ptype=Application";
}else{
    $location="http://".$_SERVER['HTTP_HOST']."/dashboard_all.php?ptype=Application";
}
header("Location: ".$location);

?>

