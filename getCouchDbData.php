<?php
    $viewStr = "KPI_applications";
    //$group_levelStr = "group_level=2";
    if (isset($_GET['view'])) {
        $viewStr = $_GET['view'];
        //echo "viewstr: $viewStr<br>";
    } else {
        $viewStr .= "?group_level=2";
    }

    //$url = "http://localhost:5984/analysis/_design/process_flow/_view/KPI?group_level=2";
    //$url = "http://tools.scilifelab.se:5984/analysis/_design/process_flow/_view/KPI?group_level=2";
    
    // get user:password from file. File should contain one line on the form username:password
    $fhandle = fopen("user_cred.txt", 'r');
    $user_password = fgets($fhandle);
    fclose($fhandle);
    
    // set up curl and call couchDb view
    $base_url = "http://$user_password@tools.scilifelab.se:5984/projects/_design/process_flow/_view/";
    //$base_url = "http://localhost:5984/projects/_design/kpi_external/_view/";
    $url = "$base_url$viewStr";
    //echo "url: $url<br>";
    $ch = curl_init($url);
    
    curl_setopt($ch, CURLOPT_HEADER, 0);
    curl_setopt($ch,  CURLOPT_RETURNTRANSFER, 1);
    
    $result = curl_exec($ch);
    curl_close($ch);
    echo $result;
?>