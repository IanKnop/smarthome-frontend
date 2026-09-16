<?php
/*  =========================================================
    KNOP.FAMILY
    Smart Home UI - View Parsing
   
    (C) 2020 by Ian Knop, Weiterstadt, Germany
    www.knop.family
    ========================================================= */

class Views {

    public static function parseTemplate($ModuleId, $Id, $Args = null)
    {
        /* parseTemplate()_____________________________________________________
        Reads and parses a HTML-Templates                                     */ 

        if ($ModuleId == '__lib') $SourceFile = 'lib/assets/' . strtolower($Id) . '.html';
        else $SourceFile = 'modules/' . strtolower($ModuleId) . '.module.assets/' . strtolower($Id) . '.html';

        if (file_exists($SourceFile))
        {
            $MaxIterations = 1000; $Iterations = 0;
            $ReturnValue = Util::parseExpressions(file_get_contents($SourceFile));

            while (Util::stringContains($ReturnValue, '{{['))
            {
                $Expression = substr($ReturnValue, strpos($ReturnValue, '{{[') + 3, strpos($ReturnValue, ']}}', strpos($ReturnValue, '{{[')) - strpos($ReturnValue, '{{[') - 3);
                if (Util::startsWith(strtoupper($Expression), 'TEMPLATE:'))
                {
                    // INCLUDE EXTERNAL TEMPLATE
                    $ReturnValue = str_replace('{{[' . $Expression . ']}}', self::parseTemplate($ModuleId, substr($Expression, 9), $Args), $ReturnValue);    
                }
                else if (Util::startsWith(strtoupper($Expression), 'IF:'))
                {
                    // {{[IF:VAR:RETURN_STRING]}}
                    $ArgProperty = explode(':', $Expression)[1];
                    $Value = substr($Expression, strpos($Expression, ':', strpos($Expression, $ArgProperty) - 1) + strlen($ArgProperty) + 2);
                    
                    if (isset($Args[$ArgProperty]) && ($Args[$ArgProperty] == true || $Args[$ArgProperty] == 1 || $Args[$ArgProperty] == "1" || strtolower($Args[$ArgProperty]) == 'true')) {
                        
                        // RENAMING TAGS INSIDE OF IF-CLAUSE FROM '{[...]}' TO '{{[...]}}'
                        $ReturnValue = str_replace('{{[' . $Expression . ']}}', str_replace('{[', '{{[', str_replace(']}', ']}}', $Value)), $ReturnValue);    

                    } else {

                        // FALSE
                        $ReturnValue = str_replace('{{[' . $Expression . ']}}', '', $ReturnValue);    
                       
                    }
                }
                else
                {
                    // SIMPLE {{[...]}}
                    $ReturnValue = str_replace('{{[' . $Expression . ']}}', (isset($Args[$Expression]) ? $Args[$Expression] : ''), $ReturnValue);    
                }

                $Iterations++;
                if ($Iterations >= $MaxIterations) break;
            }

            return $ReturnValue;
        }
        else return '';
    }

    public static function includeReferences($References) {

        /* includeReferences()____________________________________________________
        Adds references to html source code                                      */    

        $returnValue = '';
        foreach ($References as $var) {

            if (isset($var->value)) {

                $returnValue .= '<reference id="' . 'cc-var-' . rand(100000,999999) . '" cc-ref="' . @Util::val($var->id) . '" cc-ref-mode="fixed" cc-value="' . htmlentities(json_encode(@Util::val($var->value))) . '" cc-binding="' . @Util::val($var->id) . '" cc-provider="' . @Util::val($var->bindingProvider, 'internal') . '" cc-update="true"></reference>';

            } else {

                // MODES:   Convert     (Converts "binding" to new value stored under "id")
                //          Transform   (Converts "id" to new value stored under "binding")
                //          Mirror      (Copies value stored under "binding" to "id")

                $refMode      = @Util::val($var->mode, (isset($var->convert) && $var->convert != '' ? 'convert' : (isset($var->transform) && $var->transform != '' ? 'transform' : 'mirror')));
                $convert      = $refMode == 'convert' ? $var->convert : ($refMode == 'transform' ? $var->transform : '');

                $returnValue .= '<reference id="' . 'cc-var-' . rand(100000,999999) . '" cc-ref="' . @Util::val($var->id) . '" cc-ref-mode="' . $refMode . '" cc-binding="' . @Util::val($var->binding) . '" cc-provider="' . @Util::val($var->bindingProvider, 'internal') . '" ' . @Util::val($var->default, '', ' cc-default="', '"') . @Util::val($convert, '', ' cc-convert="', '"') . (isset($var->params) ? ' cc-convert-params="' . htmlentities(json_encode(@Util::val($var->params))) . '"' : '') . ' cc-update="true"></reference>';
            
            }
        }

        return $returnValue;

    }
}

class View {

    public $Id              = null;
    public $ViewSource      = null;
    public $Variant         = null;
    public $SoundEnabled    = null;
    public $ConfigSource    = null;
    public $Extension       = false;
    public $Mobile          = false;
    public $Location        = '';

    public $ViewSourceBase = 'config/';

    public function __construct($ViewSource = null) {

        /* __construct()____________________________________________________________*/
        //if (isset($ViewSource->__external)) $ViewSource = $this->getViewSource($ViewSource->__external, true, @Util::val($ViewSource->__externalArgs, null));
        //if (isset($ViewSource->__internal)) $ViewSource = $this->getViewSource($ViewSource->__internal, false, @Util::val($ViewSource->__internalArgs, null));
        
        if ($ViewSource != null) $this->replaceExternal($Source);
        $this->ViewSource = $ViewSource;
        
        if (isset($ViewSource->id)) $this->Id = $ViewSource->id;
    }

    public function getView($Variant = null, $Target = 'view') {
                
        /* getView()_____________________________________________________________
        Draws a view as defined in configuration file                           */     

        $LastRow = 1;

        return Views::parseTemplate('__lib', $Target, 
                array(
                    "id"                => $this->ViewSource->id, 
                    "soundEnabled"      => Util::toBoolString($this->SoundEnabled),
                    "block-screensaver" => (!isset($this->ViewSource->screensaver) || $this->ViewSource->screensaver == true ? 'false' : 'true'), 
                    "columns"           => 'repeat(' . floatval(Settings::get('viewGridColumns')) . ', 1fr)', 
                    "rows"              => 'repeat(' . floatval(Settings::get('viewGridRows')) . ', 1fr)', 
                    "windows"           => $this->getWindows($Variant, $LastRow),
                    "vars"              => $this->getVars($Variant, $LastRow),
                    "header"            => $this->getHeader($Target, $LastRow),
                    "modules"           => $this->getModules($Variant, null, false, $Target, $LastRow),
                    "footer"            => $this->getFooter($Target, $LastRow),
                    "lock-modules"      => ($Target == 'view' && Settings::has('lockModules') ? $this->getModules($Variant, Settings::get('lockModules')) : '')
                )
            ); 
    }

    public function getViewById($ViewId, $Variant = null, $Sound = false, $Extension = false, $ConfigSource = '', $Location = '') {
        
        /* getViewById()_________________________________________________________
        Finds view by Id and returns it                                         */       

        $this->Id           = isset($this->ViewSource->id) ? $this->ViewSource->id : 'view-' . rand(1000000, 9999999);
        $this->SoundEnabled = $Sound;

        $this->ConfigSource = $ConfigSource;
        Settings::$ConfigSource = 'config' . ($ConfigSource != '' ? '.' . $ConfigSource : '') . '.json';

        $this->ViewSource   = $this->getViewSource($ViewId, $Extension);
        $this->Variant      = $Variant;
        $this->Extension    = $Extension;
        $this->Location     = $Location;
        
        return $this->getView($Variant, 'view');
    }

    public function getViewSource($ViewId, $Extension = false, $Args = null) {

        /* getViewSource()_______________________________________________________
        Returns view source either form config or extension                     */    
        
        if ($Extension) $Source = file_get_contents($this->ViewSourceBase . $ViewId . '.json');
        else $Source = json_encode(Settings::get('views')[$this->getViewIndex($ViewId)]);

        /* REPLACE VARIABLES PROVIDES BY ARGS */
        if ($Args != null) foreach ($Args as $Key => $Var) $Source = str_replace('{{[' . $Key . ']}}', $Var, $Source); 
        
        /* CONVERT STRING TO OBJECT */
        $Source = json_decode($Source);

        /* REPLACE ALL EXTERNAL REFERENCES */
        $this->replaceExternal($Source);

        return $Source;
    }

    private function replaceExternal(&$Source) {

        /* replaceExternal()_____________________________________________________
        Replaces all external references in a source object                     */ 

        if (isset($Source->__external)) {
                
            /* REPLACE EXTERNAL REFERENCES */
            $ExternalInclude = Util::includeExternal($Source);
            
            /* CHECK IF EXTERNAL SOURCE ALSO HAS EXTERNAL REFERENCES */
            if (Util::stringContains(json_encode($ExternalInclude), '__external')) {
                $this->replaceExternal($ExternalInclude);
            }

            /* MERGE SOURCES */
            if (count((array)$Source) == 1 || (count((array)$Source) == 2 && isset($Source->__externalArgs))) {

                /* IF SOURCE OBJECT ONLY REFERENCES EXTERNAL, THE COMPLETE OBJECT IS REPLACED */
                $Source = $ExternalInclude;

            } else {

                /* MERGE EXTERNAL WITH OTHER PROPERTIES */
                if ($ExternalInclude != null) $Source = (object)array_merge((array)$Source, (array)$ExternalInclude);

                /* REMOVE EXTERNAL-TAGS AFTER MERGE */
                unset($Source->__external);
                if (isset($Source->__externalArgs)) unset($Source->__externalArgs);
            }
        }

        /* SEARCH FOR FURTHER REFERENCES IN CHILD ARRAYS AND OBJECTS */
        $this->arrayReplaceExternal($Source);

    }

    private function arrayReplaceExternal(&$Source) {

        /* arrayReplaceExternal()________________________________________________
        Crawls through arrays and objects for external references               */

        if (is_array($Source)) {

            $NewArray = [];
            foreach ($Source as $Value) {
                
                $this->replaceExternal($Value);
                array_push($NewArray, $Value);
            }

            $Source = $NewArray;

        } else if (is_object($Source)) {

            foreach ($Source as $Key => $Value) {
                
                $this->replaceExternal($Value);
                $Source->{$Key} = $Value;
            }
        } 
    
    }

    public function getViewIndex($ViewId, $StartCount = 0) {

        /* getViewIndex()________________________________________________________
        Gets array index of view with given name                                */ 

        foreach (Settings::get('views') as $View) {
            if (strtolower($View->id) == strtolower($ViewId)) return $StartCount;
            else $StartCount++;
        }
        return 0;
    }

    /* =========================================================
        VARS
       ========================================================= */
       public function getVars($Variant, &$LastRow = 1) {

        /* getVars()_____________________________________________________________
        Gets placeholders for control independent vars                           */     

        if (isset($this->ViewSource->refs)) return Views::includeReferences($this->ViewSource->refs);
        else return '';
    }

    /* =========================================================
        WINDOWS
       ========================================================= */
       private function getWindows($Variant, &$LastRow = 1) {

        /* getWindows()__________________________________________________________
        Gets windows of given view as HTML                                      */     

        $ReturnValue = '';
        if (isset($this->ViewSource->windows)) {
            
            foreach ($this->ViewSource->windows as $WindowDef) {

                $Window = new View($WindowDef);
                $ReturnValue .= $Window->getView($Variant, 'window');
            }
        }
       
        return $ReturnValue;
    }

    /* =========================================================
        HEADER
       ========================================================= */
    
    private function getHeader($Target = 'view', &$LastRow = 1) {

        /* getHeader()__________________________________________________________
        Gets header of given view as HTML                                      */     

        $ViewHeader = isset($this->ViewSource->header) ? $this->ViewSource->header : '';

        if ($Target == 'window') return $ViewHeader;
        else {
        
            $FixedHeight = Settings::get('mobileHeaderHeight', false, null);

            return Views::parseTemplate('__lib', 'view.header', 
                array(
                    "title"                 => Util::parseExpressions(Settings::get('header')), 
                    "subtitle"              => Util::parseExpressions($ViewHeader), 

                    "style"                 => '', 
                    "grid-values"           => Util::getGridValues(Settings::get('headerStart'), Settings::get('headerEnd')), 
                    "mobile-grid-values"    => Util::getMobileGridValues(explode(';', Settings::get('headerStart'))[0], explode(';', Settings::get('headerEnd'))[0], $LastRow, $FixedHeight),
                    
                    "buttons"               => $this->getHeaderButtons()));
        }
    }
    
    private function getHeaderButtons() {

        /* getHeaderButtons()___________________________________________________
        Returns "bar" of buttons in header area to switch views                */     

        $ReturnValue = '';
        foreach (Settings::get('views') as $View) if (isset($View->img) && $View->img != null && $View->img != '') {
            $ReturnValue .= '<div class="view-button" onmousedown="SmartHomeUI.showView(\'' . $View->id . '\'' . (isset($View->initial) ? ', \'' . $View->initial . '\'' : '') . ')"><img src="' . $View->img . '" class="view-button-icon"/></div>';
        }
        
        return $ReturnValue;
    }

    public static function getHeaderHeight() {

        /* getHeaderHeight()________________________________________________________
        Returns height of header                                                   */    

        return self::getHeaderEnd() - self::getHeaderStart();
    }

    public static function getHeaderStart() {

        /* getHeaderStart()_________________________________________________________
        Returns header start row                                                   */    

        return intval(explode(';', Settings::get('headerStart', false, 1))[0]);
    }

    public static function getHeaderEnd() {

        /* getHeaderEnd()___________________________________________________________
        Returns header end row                                                     */    

        return intval(explode(';', Settings::get('headerEnd', false, 1))[0]);
    }

    public static function getGridHeight() {

        /* getGridHeight()___________________________________________________________
        Returns grid height (in rows)                                               */  

        return Settings::get('viewGridRows', false, 20);

    }

    /* =========================================================
        MODULE PARSING
       ========================================================= */

    public function getModules($Variant = null, $Base = null, $SkipInitialization = false, $Target = 'view', &$LastRow = 1) {

        /* getModules()_________________________________________________________
        Parses all modules of given view as HTML                               */     

        $ReturnValue = ''; 
        if ($Base != null || ($Base == null && isset($this->ViewSource->modules))) {

            if ($Base == null) $Base = $this->ViewSource->modules;
            foreach ($Base as $ModuleSource) {
                
                $FirstLoad = false;
                if (isset($ModuleSource->module)) {

                    $ModuleClass = Modules::getModuleClass($ModuleSource->module, $FirstLoad);
                    $Module = new $ModuleClass($ModuleSource, $Variant, $this->ViewSource);

                } else if (isset($ModuleSource->img)) {
                    
                    $Module = new Module($ModuleSource, $Variant, $this->ViewSource);
                }

                if ($FirstLoad && !$SkipInitialization) $ReturnValue .= $Module->initializeModule();
                $ReturnValue .= $Module->parseModule('', $Target, $LastRow);
            }
 
            return $ReturnValue;
        }
    }

    /* =========================================================
        FOOTER PARSING
       ========================================================= */
    private function getFooter($Target = 'view', &$LastRow = 1) {

        /* getFooter()__________________________________________________________
        Gets footer for mobile view                                            */     

        if ($Target == 'window') return '';
        else {
        
            $FixedHeight = Settings::get('mobileFooterHeight', false, 2);

            return Views::parseTemplate('__lib', 'view.footer', 
                array(
                    "style"                 => '', 
                    "mobile-grid-values"    => Util::getMobileGridValues($LastRow, $LastRow, $LastRow, $FixedHeight)));
        }
    }
}   
