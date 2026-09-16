<?php
/*  =========================================================
    KNOP.FAMILY
    Smart Home UI - ioBroker API Connector
   
    (C) 2020-2022 by Ian Knop, Weiterstadt, Germany
    www.knop.family

    For further information please visit
    https://github.com/IanKnop/shc
    ========================================================= */

/* LOAD BASE LIBRARY AND ADDITIONAL LIBS*/
require_once('lib/smarthome.base.php');
Base::loadLibraries();

/* CALL TYPE */
$InterfaceRequest = isset($_GET['request']);

/* ADAPTERS */
Base::loadLibraries('adapters/', !$InterfaceRequest);

/* REQUEST PROCESSING */
if ($InterfaceRequest) {

    /* INTERFACE REQUESTS */
    $Response = new stdClass();
    switch (strtolower($_GET['request'])) {

        case 'module':
            $ModuleClass = $_GET['class'];

            /* Load module class and create new module object */
            require_once('modules/' . strtolower($ModuleClass) . '.module.php');
            $Module = new $ModuleClass(@Util::val($_GET['source']), @Util::val($_GET['variant']));

            /* Create Response */
            $Response->code = 200;
            $Response->message = urlencode($Module->parseModule('', 'content')); 
            break;

        case 'control':
            $ControlClass = $_GET['control'];

            require_once('modules/canvas.module.assets/' . strtolower($ControlClass) . '/canvas.' . strtolower($ControlClass) . '.php');
            $Control = new $ControlClass();
            
            $Response->code = 200;
            $Response->message = urlencode($Control->parseControl(json_decode($_GET['source'])));            
            break;
    
        case 'adapter':
            $AdapterClass = $_GET['adapter'];

            require_once('adapters/' . strtolower($AdapterClass) . '.adapter.php');
            $Adapter = new $AdapterClass();

            $Adapter->getData($_GET['queries']);            
            break;
        
        default:
            $Response->code = 500;
            $Response->message = 'INTERFACE ERROR';
    }

    echo json_encode($Response);

} else {

    /* VIEW REQUESTS */
    Base::loadScripts();
    Base::loadStyles();

    $View = new View();
    $IsMobile = Util::stringContains(strtoupper($_SERVER['HTTP_USER_AGENT']), 'ANDROID') || Util::stringContains(strtoupper($_SERVER['HTTP_USER_AGENT']), 'IPHONE');
    $StartView = ($IsMobile ? (Settings::has('mobileStartView') ? Settings::get('mobileStartView') : (Settings::has('startView') ? Settings::get('startView') : 'home')) : (Settings::has('startView') ? Settings::get('startView') : 'home'));

    echo Views::parseTemplate('__lib', 'page.header');

    echo $View->getViewById(
        (isset($_GET['view']) ? $_GET['view'] : $StartView), 
        (isset($_GET['variant']) ? $_GET['variant'] : null), 
        (isset($_GET['sound']) ? $_GET['sound'] : false),
        false, 
        (isset($_GET['source']) ? $_GET['source'] : ''));

    echo (isset($_GET['return']) ? '<script>setTimeout(function() { SmartHomeUI.showView(\'home\'); }, ' . $_GET['return'] . ');</script>' : '');

}

?>