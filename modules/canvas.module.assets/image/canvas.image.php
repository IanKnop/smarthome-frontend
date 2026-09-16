<?php
/*  =========================================================
    KNOP.FAMILY
    Smart Home UI - Image (for Canvas)
   
    (C) 2020 by Ian Knop, Weiterstadt, Germany
    www.knop.family
    ========================================================= */

class Image extends Control implements ICanvasControl {

    public $ParentModule = null;
    
    public function __construct($ParentModule) {

        /* __construct()____________________________________________________________*/

        $this->ParentModule = $ParentModule;
    }

    public function parseControl($Source, $Variant = null) {

        /* parseControl()___________________________________________________________
        Returns image as canvas element                                            */    

        //echo Util::getFirstVariant($Source->src, null, null); exit;

        return Views::parseTemplate('canvas', 'image/_templates/image', array(
            "id"                => @Util::val($Source->id, 'image-' . rand(1000000, 9999999)),
            "src"               => isset($Source->src) ? 'img/' . Util::getVariantValue($Source->src, $Variant, null) : '',
            
            "style"             => Util::getStdStyles($Source->style) . 
                               (isset($Source->style) ? Util::getStdStyles(Util::getValueByScope($Source->style, 'control', false)) : '') .
                               (isset($Source->style) ? Util::getStdStyles(Util::getValueByScope($Source->style, 'element', false)) : ''),

            "content-style"     => isset($Source->style) ? Util::getStdStyles(Util::getValueByScope($Source->style, 'content', false)) : '',
            
            "class"             => isset($Source->class) ? Util::getValueByScope($Source->class, 'element', true) : '',
            "content-class"     => isset($Source->imageClass) ? Util::getValueByScope($Source->imageClass, 'content') : '',
            
            "imagemap"          => (isset($Source->imagemap) ? $this->getImageMap($Source->imagemap) : ''),

            "binding"           => @Util::val($Source->binding, '', 'cc-binding="', '"'),
            "provider"          => @Util::val($Source->bindingProvider, '', 'cc-provider="', '"'),
            "update"            => (isset($Source->binding) && $Source->binding != '' ? 'true': 'false'),

            "action"            => $this->getEventFromAction($Source, true),
 
            "conditions"        => isset($Source->conditions) ? 'cc-conditions="' . Util::getValueByScope($Source->conditions, 'element') .  '"' : '',
            "content-conditions"=> isset($Source->conditions) ? 'cc-conditions="' . Util::getValueByScope($Source->conditions, 'content', false)  .  '"' : ''));
    }

    private function getImageMap($Map) {

        /* getImageMap()___________________________________________________________
        Returns image map as overlay for current image                            */   

        $ReturnValue = '';

        foreach($Map as $Area) {

            $ReturnValue .= Views::parseTemplate('canvas', 'image/_templates/image.area', array(
                "id"            => @Util::val($Area->id, 'label-' . rand(1000000, 9999999)),
                "style"         => Util::getStdStyles($Area->style),
                "action"        => $this->getEventFromAction($Area, true, true)));
        }

        return $ReturnValue;

    }
}
?>