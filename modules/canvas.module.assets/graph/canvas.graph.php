<?php
/*  =========================================================
    KNOP.FAMILY
    Smart Home UI - Graph (for Canvas)
   
    (C) 2022 by Ian Knop, Weiterstadt, Germany
    www.knop.family
    ========================================================= */

class Graph extends Control implements ICanvasControl {

    const DEFAULT_VALUE_RANGE = 0.5;
    const DEFAULT_OFFSET = 0.075;

    public $ParentModule = null;
    
    public function __construct($ParentModule) {

        /* __construct()____________________________________________________________*/

        $this->ParentModule = $ParentModule;
    }

    public function parseControl($Source, $Variant = null) {

        /* parseControl()____________________________________________________________
        Returns graph as canvas element                                             */    

        return Views::parseTemplate('canvas', 'graph/_templates/graph', array(
            "id"                => @Util::val($Source->id, 'graph-element-' . rand(1000,9999)),
            
            "element-style"     => isset($Source->style) ? Util::getStdStylesByScope($Source->style, 'element', true) . ' ' : '',
            
            "action"            => $this->getEventFromAction($Source, true),
            "update"            => 'true',

            /* Graph specific properties */
            "graph"             => $this->drawGraph($Source, $Caption, $HasTitle),
            "showtitle"         => (isset($Source->showExtTitle) ? $Source->showExtTitle : true),
            "layout"            => (isset($Source->layout) ? 'cc-layout="' . htmlentities(json_encode($Source->layout)) . '"' : ''),
            "layoutmaps"        => (isset($Source->layout) ? 'cc-layout-maps="' . htmlentities(json_encode($Source->layoutMaps)) . '"' : ''),
            "views"             => (isset($Source->views) ? 'cc-views="' . htmlentities(json_encode($Source->views)) . '"' : ''),
            
            /* View-defined parameters */
            "view"              => (isset($Source->defaultView) ? $Source->defaultView : ''),
            "binding"           => @Util::val($this->getFromView($Source, 'binding'), '', 'cc-binding="', '"'),
            "bindingprovider"   => @Util::val($this->getFromView($Source, 'bindingProvider'), 'cc-provider="graph"', 'cc-provider="', '"'),
            "bindingdelay"      => (isset($Source->bindingDelay) ? 'cc-binding-delay="' . ($Source->bindingDelay ? 'true' : 'false') . '"' : ''),
            "viewtitle"         => @Util::val($this->getFromView($Source, 'title'), '', 'cc-title="', '"'),
            "options"           => @Util::val($this->getFromView($Source, 'options'), '', 'cc-options="', '"'),
            "offset"            =>  @Util::val($this->getFromView($Source, 'offset', self::DEFAULT_OFFSET), '', 'cc-offset="', '"'),
            "title"             => (!isset($Source->showTitle) || $Source->showTitle ? Util::val($this->getFromView($Source, 'title')) : ''),
            
            "conditions"        => isset($Source->conditions) ? 'cc-conditions="' . Util::getValueByScope($Source->conditions, 'element', true) .  '"' : '',
            "content-conditions"=> isset($Source->conditions) ? 'cc-conditions="' . Util::getValueByScope($Source->conditions, 'content') .  '"' : '',

            "controlprovider"   => @Util::val($Source->controlProvider, 'graph')));
    }

    private function getFromView($Source, $Property, $DefaultValue = null, $ViewId = null) {

        if ($ViewId == null) $ViewId = (isset($Source->defaultView) ? $Source->defaultView : null);
        if ($ViewId != null && isset($Source->views->{$ViewId}->{$Property})) {
         
            if (is_object($Source->views->{$ViewId}->{$Property})) return htmlentities(json_encode($Source->views->{$ViewId}->{$Property}));
            else return $Source->views->{$ViewId}->{$Property};

        } else if ($ViewId != null && !isset($Source->views->{$ViewId}->{$Property})) return $DefaultValue;
        else return '';

    }

    private function drawGraph($CanvasElement, &$Caption, &$SmallTitle) {

        /* drawGraph()_________________________________________________________
        Calculates graph based on data list                                   */    

        return Views::parseTemplate('canvas', 'graph/_templates/graph.inner', array(
            "id"                => @Util::val($CanvasElement->id, 'graph-' . rand(1000,9999)),
            
            "control-style"     => isset($CanvasElement->style) ? Util::getStdStylesByScope($CanvasElement->style, 'control', true) . ' ' : '',
            
            "line"              => '',
            "points"            => ''));

        return '';
    }

    
}
?>