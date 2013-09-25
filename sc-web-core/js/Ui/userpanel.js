SCWeb.ui.UserPanel = {
    
    /*!
     * Initialize user panel.
     * @param {Object} params Parameters for panel initialization.
     * There are required parameters:
     * - sc_addr - sc-addr of user
     * - is_authenticated - flag that have True value, in case when user is authenticated
     * - current_lang - sc-addr of used natural language
     */
    init: function(params, callback) {
        
        
        this.is_authenticated = params.is_authenticated;
        this.user_sc_addr = params.sc_addr;
        this.lang_mode_sc_addr = params.current_lang;
        
        if (this.is_authenticated) {
            $('#auth-user-name').attr('sc_addr', this.user_sc_addr).text(this.user_sc_addr);
            $('#auth-user-lang').attr('sc_addr', this.lang_mode_sc_addr).text(this.lang_mode_sc_addr);
        }
        
        SCWeb.core.Translation.registerListener(this);
        
        SCWeb.ui.Utils.bindArgumentsSelector("auth-user-panel", "[sc_addr]");
        
        callback();
    },
    
    // ---------- Translation listener interface ------------
    updateTranslation: function(namesMap) {
        // apply translation
        $('#auth-user-panel [sc_addr]').each(function(index, element) {
            var addr = $(element).attr('sc_addr');
            if(namesMap[addr]) {
                $(element).text(namesMap[addr].replace('user::', '').replace('session::', ''));
            }
        });
        
    },
    
    /**
     * @return Returns list obj sc-elements that need to be translated
     */
    getObjectsToTranslate: function() {
        var items = [];
        $('#auth-user-panel [sc_addr]').each(function(index, element) {
            items.push($(element).attr('sc_addr'));
        });
        return items;
    }

};