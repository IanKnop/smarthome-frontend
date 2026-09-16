/*  =========================================================
    KNOP.FAMILY
    Smart Home Control Center - Canvas Progress Bar Scripts
   
    (C) 2021 by Ian Knop, Weiterstadt, Germany
    www.knop.family
    ========================================================= */

// ADAPTER REGISTRATION AFTER LOAD
this.addEventListener("load", function () {

    ControlProviders.progressBar = new ProgressBar();

});

// ADAPTER BASE FUNCTION
function ProgressBar() {

    ProgressBar.prototype.parseControl = function (control, updateTimestamp = null) {

        /* parseControl()___________________________________________________________
        Refreshes progress bar                                                     */

        var value = Dataset[control.binding];
        
        if (value != undefined && value != null) {

            var currentControl  = document.getElementById(control.id);
            
            var bar             = currentControl.querySelectorAll('div.progress-bar')[0];
            var valueLabel      = currentControl.querySelectorAll('div.progress-value')[0];

            if (currentControl.hasAttribute('cc-min') && currentControl.hasAttribute('cc-max')) {
                value = 100 * (parseFloat(value) - parseFloat(currentControl.getAttribute('cc-min'))) / (parseFloat(currentControl.getAttribute('cc-max')) - parseFloat(currentControl.getAttribute('cc-min')));
            } 

            value               = Math.max(0, parseFloat(value));
            bar.style.width     = ('calc(' + value.toString() + '% - (2 * var(--bar-inner-border)))');    
        }
    }
}