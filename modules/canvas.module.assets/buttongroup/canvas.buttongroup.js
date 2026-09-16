/*  =========================================================
    KNOP.FAMILY
    Smart Home UI - Canvas Module Functions
   
    (C) 2021 by Ian Knop, Weiterstadt, Germany
    www.knop.family
    ========================================================= */

// CONTROL REGISTRATION AFTER LOAD
this.addEventListener("load", function () {

    ControlProviders.controlGroup = new ControlGroup();

});

function ControlGroup() {

    ControlGroup.prototype.listUpdated = [];
    ControlGroup.prototype.valueUpdated = [];

    ControlGroup.prototype.parseControl = function (controlInfo, bindValue) {

        /* parseControl()___________________________________________________________
        Refreshes canvas control group items                                       */

        /* TYPE */
        var typeAttr = controlInfo.control.getAttribute('cc-type').toLowerCase();
        
        /* OBJECTS */
        var control = controlInfo.control;

        if (typeAttr == 'combo') {

            var dataBinding     = control.getAttribute('cc-data-binding').replace('*', '');
            var dataBindValue   = eval('Dataset.' + dataBinding);

            var keyCombo        = dataBinding + '@' + control.id;

            if (dataBindValue != undefined && dataBindValue != null) {
            
                this.parseComboList(control, dataBindValue);
                ButtonGroups.setValueLabel(control, bindValue);
            }
        }
    }

    ControlGroup.prototype.updateActiveState = function (control, state, deviceId) {

        /* updateActiveState()________________________________________________
        Changes style of given element to active or inactive                 */

        return ControlProviders['canvas'].updateActiveState(control, state, deviceId);
    }

 /* =========================================================
     BUTTONS
    ========================================================= */

 /* =========================================================
     COMBO CONTROL
    ========================================================= */
    ControlGroup.prototype.parseComboList = function (control, bindValue) {

        /* parseComboList()___________________________________________________
        Creates list of items to select of combo control                     */

        /* SET [cc-values] ON COMBO LIST CONTROL */
        control.setAttribute('cc-values', JSON.stringify(bindValue));

        if (control.parentNode != undefined && control.parentNode.querySelectorAll('[class=canvas-control-combo-list]').length > 0) {

            var itemsList = '';
            Object.keys(bindValue).forEach(key => {

                var value = bindValue[key];
                var targetCode =  'ControlProviders.controlGroup.setComboValue(\'' + control.id + '\', \'' + key + '\')';

                itemsList += '<span class="canvas-control-combo-item" onmousedown="' + targetCode + '">' + value + '</span>';

            })

            control.parentNode.querySelectorAll('[class=canvas-control-combo-list]')[0].innerHTML = itemsList;
        } 
    }

    ControlGroup.prototype.updateValue = function (controlInfo, bindValue, valueBinding) {

        /* updateValue()_______________________________________________________
        Allows update of combo control value                                  */

        this.valueUpdated.splice(this.valueUpdated.indexOf(valueBinding), 1);
        this.parseControl(controlInfo, bindValue);
    
    }

    ControlGroup.prototype.invokeComboChange = function (control) {

        /* invokeComboChange()_________________________________________________
        Runs event in case of combo value change                              */
        
        var script = control.hasAttribute('onchange') ? control.getAttribute('onchange').replace(/{value}/g, control.getAttribute('cc-value')) : null;
        if (script != null) return eval(script); else return false
       
    }
    
    ControlGroup.prototype.toggleComboList = function (control) {

        /* toggleComboList()___________________________________________________
        Shows or hides combo control list                                     */
        
        var frame   = document.getElementById('cc-combobox-list');
        var list    = document.getElementById('cc-combobox-list-content');
        var source  = control.querySelectorAll('[class*=canvas-control-combo-list]')[0];

        if (frame.style.visibility == 'collapse' || frame.style.visibility == 'hidden') {
            
            refreshStates(true);
            list.innerHTML = source.innerHTML;
            frame.style.visibility = '';
        
        } else {
            
            frame.style.visibility = 'collapse';

        }
    }

    ControlGroup.prototype.setComboValue = function (controlId, value) {

        /* setComboValue()____________________________________________________
        Sets value of combo control                                          */

        var control         = document.getElementById(controlId);
        var bindingInfo     = getBindingInfo(control.getAttribute('cc-binding'));
        var controlInfo     = getControlInfo(control);

        /* SAVE KEY TO INTERNAL FIELD DEFINED BY BINDING-TAG */
        Adapters.internal.setValue(bindingInfo, value);
        Adapters.internal.refreshState(bindingInfo, Date.now(), false, true);

        /* RUN EVENT */
        this.updateValue(controlInfo, value, control.getAttribute('cc-binding'));
        
        this.invokeComboChange(control);
        this.toggleComboList(control);
        
        refreshStates(true);

    }
}

/* =========================================================
    BUTTON GROUP FUNCTIONS
   ========================================================= */

var ButtonGroups = new function () {

    this.setValueLabel = function(control, value) {

        /* setValueLabel()_______________________________________________________
        Sets value label                                                        */

        if (control.hasAttribute('cc-values') && control.getAttribute('cc-values') != '') {

            var binding = value;
            value = JSON.parse(control.getAttribute('cc-values'))[value];
        }
            
        var currentType = (control.hasAttribute('cc-type') ? control.getAttribute('cc-type').toLowerCase() : 'text');

        if (value != null && value != undefined) {
            
            var prefix = control.hasAttribute('cc-prefix') ? control.getAttribute('cc-prefix') : '';
            var suffix = control.hasAttribute('cc-suffix') ? control.getAttribute('cc-suffix') : '';
            var decimals = control.getAttribute('cc-decimals');

            switch (currentType) {

                case 'numeric': case 'number':
                    var fixedValue = (value.toFixed(decimals));
                    control.innerHTML = (prefix != null ? prefix : '') + replaceComma(fixedValue) + (suffix != null ? suffix : '');
                    break;

                default:
                    control.innerHTML = (prefix != null ? prefix : '') + value + (suffix != null ? suffix : '');
                    
                    break;
            }

        } else if (currentType == 'combo') {

            if (control.getAttribute('cc-default') != null) this.setValueLabel(control, control.getAttribute('cc-default'));
            else control.innerHTML = '<p style="opacity: 0.35">Bitte wählen...</p>';
        }

        if (binding != undefined && control.hasAttribute('cc-value')) control.setAttribute('cc-value', binding);
        else if (control.hasAttribute('cc-value')) control.setAttribute('cc-value', value);
    }
    
    this.toggleButton = function(senderControl, returnDataset = null) {

        /* toggleButton()________________________________________________________
        Toggles button value true/false                                         */

        var returnValue = (!senderControl.hasAttribute('cc-value') || senderControl.getAttribute('cc-value') == 'false');
        senderControl.setAttribute('cc-value', returnValue)

        if (returnDataset != null) returnDataset[senderControl.getAttribute('cc-binding')] = returnValue;
        return returnValue;
    }

}