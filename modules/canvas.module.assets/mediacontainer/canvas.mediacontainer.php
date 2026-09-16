<?php
/*  =========================================================
    KNOP.FAMILY
    Smart Home UI - Media Container (for Canvas)
   
    (C) 2020 by Ian Knop, Weiterstadt, Germany
    www.knop.family
    ========================================================= */

class MediaContainer extends Control implements ICanvasControl {

    public $ParentModule = null;
    
    public function __construct($ParentModule) {

        /* __construct()____________________________________________________________*/

        $this->ParentModule = $ParentModule;
    }

    public function parseControl($Source, $Variant = null) {

        /* getProgressBar()_________________________________________________________
        Returns standard progress bar as canvas element                            */    
        
        return Views::parseTemplate('canvas', 'mediacontainer/_templates/mediacontainer', array(
            "style"      => 'align-self: start; ' . (isset($Source->style) ? Util::getStdStyles(Util::getValueByScope($Source->style, 'control')) : ''),
            "media"      => $this->getMedia($Source, $Variant)));
    }

    private function getMedia($Source, $Variant = null) {

        /* getMedia()_______________________________________________________________
        Returns standard progress bar as canvas element                            */
        
        $MediaType = @Util::val($Source->mediaType, 'image');
        switch (strtolower($MediaType)) {

            case 'image':
                return $this->getImage($Source, $Variant);

            case 'website':
                return $this->getWebsite($Source, $Variant);

            case 'video':
                return $this->getVideo($Source, $Variant);

            case 'flv':
                return $this->getVideo($Source, $Variant, 'flv');
        }

        return '';
    }

    private function getImage($Source, $Variant = null) {

        /* getImage()_______________________________________________________________
        Returns image                                                              */
        
        return Views::parseTemplate('canvas', 'mediacontainer/_templates/mediacontainer.image', array(
            "id"                => @Util::val($Source->id, 'media-image-' . rand(1000, 9999)),

            "content-style"     => (isset($Source->style) ? Util::getStdStyles(Util::getValueByScope($Source->style, 'content', false)) : ''),

            "src"               => (isset($Source->img) ? Util::getVariantValue($Source->img, $Variant) : ''),
            "class"             => (isset($Source->class) ? Util::getStdStyles(Util::getValueByScope($Source->class, 'content', false)) : ''),
            "action"            => $this->getEventFromAction($Source),
            "update"            => (isset($Source->binding) ? 'true' : 'false'),
            "binding"           => @Util::val($Source->binding, '', 'cc-binding="', '"'),
            "provider"          => @Util::val($Source->bindingProvider, 'cc-provider="media"', 'cc-provider="', '"'),
            "dataprovider"      => @Util::val($Source->dataProvider, '', 'cc-dataprovider="', '"')));
    }

    private function getWebsite($Source, $Variant = null) {

        /* getWebsite()_____________________________________________________________
        Returns frame for external website                                         */
        
        return Views::parseTemplate('canvas', 'mediacontainer/_templates/mediacontainer.iframe', array(
            "id"                => @Util::val($Source->id, 'media-iframe-' . rand(1000, 9999)),

            "content-style"     => (isset($Source->style) ? Util::getStdStyles(Util::getValueByScope($Source->style, 'content', false)) : ''),

            "src"               => (isset($Source->src) ? Util::getVariantValue($Source->src, $Variant) : ''),
            "width"             => @Util::val($Source->width, '', 'width="', '"'),
            "height"            => @Util::val($Source->height, '', 'height="', '"'),
            "class"             => (isset($Source->class) ? Util::getStdStyles(Util::getValueByScope($Source->class, 'content', false)) : ''),
            "action"            => $this->getEventFromAction($Source),
            "update"            => (isset($Source->binding) ? 'true' : 'false'),
            "binding"           => @Util::val($Source->binding, '', 'cc-binding="', '"'),
            "provider"          => @Util::val($Source->bindingProvider, 'cc-provider="media"', 'cc-provider="', '"'),
            "dataprovider"      => @Util::val($Source->dataProvider, '', 'cc-dataprovider="', '"')));
    }

    private function getVideo($Source, $Variant = null, $sourceType = null, $player = 'hj') {

        /* getVideo()_______________________________________________________________
        Returns video control                                                      */
        
        return Views::parseTemplate('canvas', 'mediacontainer/_templates/mediacontainer.video' . ($sourceType != null ? '.' . strtolower($sourceType) : ''), array(
            "id"            => @Util::val($Source->id, 'media-video-' . rand(1000, 9999)),
            "style"         => (isset($Source->style) ? Util::getStdStyles(Util::getValueByScope($Source->style, 'content', false)) : ''),
            "src"           => (isset($Source->src) ? ($player == 'hj' ? 'src="' : '') . Util::getVariantValue($Source->src, $Variant) . '"' : ''),
            "autoplay"      => (isset($Source->autoplay) ? ($player == 'hj' ? 'autoplay="' : '') . $Source->autoplay . '"' : ''),
            "class"         => (isset($Source->class) ? Util::getStdStyles(Util::getValueByScope($Source->class, 'content', false)) : ''),
            "action"        => $this->getEventFromAction($Source),
            "update"        => (isset($Source->binding) ? 'true' : 'false'),
            "binding"       => @Util::val($Source->binding, '', 'cc-binding="', '"'),
            "provider"      => @Util::val($Source->bindingProvider, 'cc-provider="media"', 'cc-provider="', '"'),
            "dataprovider"  => @Util::val($Source->dataProvider, '', 'cc-dataprovider="', '"')));
    }
}
?>