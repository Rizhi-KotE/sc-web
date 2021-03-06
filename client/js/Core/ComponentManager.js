import {ComponentSandbox} from "./ComponentSandbox";
import {KeyboardHandler} from "../Ui/KeyboardHandler";
import {OpenComponentHandler} from "../Ui/OpenComponentHandler";
import {Server} from "./Server";
import * as jQuery from "jquery";

export const ComponentType = {
    viewer: 0,
    editor: 1
};

export const ComponentManager = {

    /**
     * {Object} listener Listener object. It must to has functions:
     * - onComponentRegistered - function, that call when new component registered. It receive
     * component description object as argument
     * - onComponentUnregistered - function, that calls after one of the component was unregistered.
     * It receive component description object as argument
     */
    _listener: null,
    _initialize_queue: [],
    _componentCount: 0,
    _factories_fmt: {},
    _factories_ext_lang: {},
    _ext_langs: {},
    _keynodes: [],      // array of keynodes that requested by components

    init: function () {
        const dfd = new jQuery.Deferred();

        // deffered will be resolved when all component will be registered
        this._componentCount = this._initialize_queue.length;

        // first of all we need to resolve sc-addrs of keynodes
        let keynodes = [];
        for (let i = 0; i < this._initialize_queue.length; i++) {
            const c = this._initialize_queue[i];
            keynodes = keynodes.concat(c.formats);
            if (c.getRequestKeynodes) {
                keynodes = keynodes.concat(c.getRequestKeynodes());
            }
            if (this._initialize_queue[i].ext_lang)
                keynodes.push(c.ext_lang);
        }

        const self = this;
        Server.resolveScAddr(keynodes, function (addrs) {

            self._keynodes = addrs;
            for (let i = 0; i < self._initialize_queue.length; i++) {
                const comp_def = self._initialize_queue[i];

                const lang_addr = addrs[comp_def.ext_lang];
                let formats = null;
                if (lang_addr) {
                    formats = [];
                    self._factories_ext_lang[lang_addr] = comp_def;
                }

                for (let j = 0; j < comp_def.formats.length; j++) {
                    const fmt = addrs[comp_def.formats[j]];

                    if (fmt) {
                        self.registerFactory(fmt, comp_def);
                        if (formats) {
                            formats.push(fmt);
                        }
                    }
                }

                if (formats && lang_addr) {
                    self._ext_langs[lang_addr] = formats;
                }
            }

            dfd.resolve();
        });

        return dfd.promise();
    },

    /**
     * Append new component initialize function
     * @param {Object} component_desc Object that define component. It contains such properties as:
     * - formats - Array of system identifiers of supported formats
     * - factory - factory function (@see ComponentManager.registerFactory)
     */
    appendComponentInitialize: function (component_def) {
        this._initialize_queue.push(component_def);
    },

    /** Register new component factory
     * @param {Array} format_addr sc-addr of supported format
     * @param {Function} func Function that will called on instance reation. If component instance created, then returns true; otherwise returns false.
     * This function takes just one parameter:
     * - sandbox - component sandbox object, that will be used to communicate with component instance
     */
    registerFactory: function (format_addr, func) {
        this._factories_fmt[format_addr] = func;
    },

    /** Check if compoenent for specified format supports structures
     */
    isStructSupported: function (format_addr) {
        let comp_def = this._factories_fmt[format_addr];
        if (!comp_def)
            throw "There are no component that supports format: " + format_addr;

        return comp_def.struct_support;
    },

    /**
     * Create new instance of component window
     * @param {Object} options          Object that contains creation options:
     *          {String} format_addr    Sc-addr of window format
     *          {Integer} addr          Sc-addr of sc-link or sc-structure, that edit or viewed with sandbox
     *          {Boolean} is_struct     If that paramater is true, then addr is an sc-addr of struct;
     *                                  otherwise the last one a sc-addr of sc-link
     *          {String} container      Id of dom object, that will contain window
     *          {Boolean} canEdit       If that value is true, then request editor creation; otherwise - viewer
     * @param {Function} callback Callback function that calls on creation finished
     * @return Return component sandbox object for created window instance.
     * If window doesn't created, then returns null
     */
    createWindowSandboxByFormat: function (options, callback) {
        const dfd = new jQuery.Deferred();
        const comp_def = this._factories_fmt[options.format_addr];

        if (comp_def) {
            const sandbox = new ComponentSandbox({
                container: options.container,
                window_id: options.window_id,
                addr: options.addr,
                is_struct: options.is_struct,
                format_addr: options.format_addr,
                keynodes: this._keynodes,
                command_state: options.command_state,
                canEdit: options.canEdit
            });
            if (!comp_def.struct_support && options.is_struct)
                throw "Component doesn't support structures: " + comp_def;

            const component = comp_def.factory(sandbox);
            if (component.editor) {
                if (component.editor.keyboardCallbacks) {
                    KeyboardHandler.subscribeWindow(options.window_id, component.editor.keyboardCallbacks);
                }
                if (component.editor.openComponentCallbacks) {
                    OpenComponentHandler.subscribeComponent(options.window_id, component.editor.openComponentCallbacks);
                }
            }
            if (component) {
                dfd.resolve();

            } else throw "Can't create viewer properly"
        } else {
            dfd.reject();
        }

        return dfd.promise();
    },

    /**
     * Create new instance of component window
     * @param {Object} options          Object that contains creation options:
     *          {String} ext_lang_addr  Sc-addr of window external language
     *          {Integer} addr           Sc-addr of sc-link or sc-structure, that edit or viewed with sandbox
     *          {Boolean} is_struct     If that paramater is true, then addr is an sc-addr of struct;
     *                                  otherwise the last one a sc-addr of sc-link
     *          {String} container      Id of dom object, that will contain window
     *          {Boolean} canEdit       If that value is true, then request editor creation; otherwise - viewer
     * @param {Function} callback Callback function that calls on creation finished
     * @return Sandbox component sandbox object for created window instance.
     * If window doesn't created, then returns null
     */
    createWindowSandboxByExtLang: function (options, callback) {
        const comp_def = this._factories_ext_lang[options.ext_lang_addr];

        if (comp_def) {

            const sandbox = new ComponentSandbox({
                container: options.container,
                addr: options.addr,
                is_struct: options.is_struct,
                format_addr: null,
                keynodes: this._keynodes,
                canEdit: options.canEdit,
                command_state: options.command_state
            });
            if (!comp_def.struct_support && options.is_struct)
                throw "Component doesn't support structures: " + comp_def;

            if (comp_def.factory(sandbox))
                return sandbox;
        }

        return null;
    },

    /**
     * Returns sc-addr of primary used format for specified external language
     * @param {String} ext_lang_addr sc-addr of external language
     */
    getPrimaryFormatForExtLang: function (ext_lang_addr) {
        const fmts = this._ext_langs[ext_lang_addr];

        if (fmts && fmts.length > 0) {
            return fmts[0];
        }

        return null;
    },

    /* Returns list of external languages, that has components for sc-structure visualization */
    getScStructSupportExtLangs: function () {
        const res = [];

        for (let ext_lang in this._factories_ext_lang) {
            if (this._factories_ext_lang.hasOwnProperty(ext_lang)) {
                if (this._factories_ext_lang[ext_lang].struct_support)
                    res.push(ext_lang);
            }
        }

        return res;
    },

    /**
     * Setup component listener
     * @param {Object} listener Listener object. It must to has functions:
     * - onComponentRegistered - function, that call when new component registered. It receive
     * component description object as argument
     * - onComponentUnregistered - function, that calls after one of the component was unregistered.
     * It receive component description object as argument
     */
    setListener: function (listener) {
        this._listener = listener;
    },

    /**
     * Fires event when new component registered
     */
    _fireComponentRegistered: function (compDescr) {
        if (this._listener) {
            this._listener.componentRegistered(compDescr);
        }
    },

    /**
     * Fires event when any of components unregistered
     */
    _fireComponentUnregistered: function (compDescr) {
        if (this._listener) {
            this._listener.componentUnregistered(compDescr);
        }
    }
};
