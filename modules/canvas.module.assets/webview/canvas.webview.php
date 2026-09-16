<?php
/*  =========================================================
    KNOP.FAMILY
    Smart Home UI - Image (for Canvas)
   
    (C) 2022 by Ian Knop, Weiterstadt, Germany
    www.knop.family
    ========================================================= */

class WebView extends Control implements ICanvasControl {

    public $ParentModule = null;
    
    public function __construct($ParentModule) {

        /* __construct()____________________________________________________________*/

        $this->ParentModule = $ParentModule;
    }

    public function parseControl($Source, $Variant = null) {

        /* parseControl()___________________________________________________________
        Returns webview control as canvas element                                  */    

        return Views::parseTemplate('canvas', 'webview/_templates/webview', array(
            "id"            => @Util::val($Source->id, 'label-' . rand(1000000, 9999999)),
            "src"           => (isset($Source->src) ? $Source->src : ''),
            "class"         => isset($Source->class) ? Util::getValueByScope($Source->class, 'control', false) : '',
            "style"         => isset($Source->style) ? Util::getStdStyles(Util::getValueByScope($Source->style, 'control')) : '',
            "binding"       => @Util::val($Source->binding, '', 'cc-binding="', '"'),
            "provider"      => @Util::val($Source->bindingProvider, '', 'cc-provider="', '"'),
            "update"        => (isset($Source->binding) && $Source->binding != '' ? 'true': 'false'),
            "conditions"    => isset($Source->conditions) ? 'cc-conditions="' . htmlentities(json_encode($Source->conditions)) .  '"' : ''));
    }
}
?>