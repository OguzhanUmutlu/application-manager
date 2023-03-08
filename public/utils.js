// noinspection JSUnusedGlobalSymbols

const Utils = {};

class Application {
    /*** @type {number} */
    id;
    /*** @type {string} */
    name;
    /*** @type {Section[]} */
    sections = [];

    static STATUS = {
        NOT_SUBMITTED: 0,
        PENDING: 1,
        REJECTED: 2,
        APPROVED: 3
    };

    /**
     * @param {number} id
     * @returns {Application}
     */
    setId(id) {
        this.id = id;
        return this;
    };

    /**
     * @param {string} name
     * @returns {Application}
     */
    setName(name) {
        this.name = name;
        return this;
    };

    /**
     * @param {Section} sections
     * @returns {Application}
     */
    addSection(...sections) {
        this.sections.push(...sections);
        return this;
    };

    toJSON() {
        if (typeof this.id === "undefined") throw new Error("Application's 'id' was not defined.");
        if (typeof this.name === "undefined") throw new Error("Application's 'name' was not defined.");
        return {
            id: this.id,
            name: this.name,
            sections: this.sections.map(i => i.toJSON())
        };
    };

    static fromJSON(json) {
        return new Application()
            .setId(json.id)
            .setName(json.name)
            .addSection(...json.sections.map(Section.fromJSON));
    };
}

class Section {
    /*** @type {number} */
    id;
    /*** @type {string | null} */
    background = null;
    /*** @type {Component[]} */
    components = [];

    /**
     * @param {number} id
     * @returns {Section}
     */
    setId(id) {
        this.id = id;
        return this;
    };

    /**
     * @param {string | null} background
     * @returns {Section}
     */
    setBackground(background) {
        this.background = background;
        return this;
    };

    /**
     * @param {Component} components
     * @returns {Section}
     */
    addComponent(...components) {
        this.components.push(...components);
        return this;
    };

    toJSON() {
        if (typeof this.id === "undefined") throw new Error("Section's 'id' was not defined.");
        return {
            id: this.id,
            background: this.background,
            components: this.components.map(i => i.toJSON())
        };
    };

    static fromJSON(json) {
        return new Section()
            .setId(json.id)
            .setBackground(json.background)
            .addComponent(...json.components.map(i => Component.fromJSON(i)));
    };
}

class Component {
    static SHORT_ANSWER = 0;
    static PARAGRAPH = 1;
    static MULTIPLE_CHOICE = 2;
    static CHECKBOXES = 3;
    static DROPDOWN = 4;
    static FILE_UPLOAD = 5;
    static LINEAR_SCALE = 6;
    static MULTIPLE_CHOICE_GRID = 7;
    static CHECKBOX_GRID = 8;
    static DATE = 9;
    static TIME = 10;
    static TEXT = 11;
    static VIDEO = 12;

    static CLASSES = {};

    /*** @type {number} */
    id;
    /*** @type {number} */
    type;
    /*** @type {string} */
    title = "";
    /*** @type {string | null} */
    image = null;

    createInput(json, type = "input") {
        const inp = document.createElement(type);
        inp.classList.add(type);
        inp.placeholder = json.placeholder;
        inp.minLength = json.min_length;
        inp.maxLength = json.max_length;
        inp.required = json.required;
        if (type === "textarea") {
            const i = setInterval(() => {
                if (!inp.parentElement) return clearInterval(i);
                inp.style.height = "auto";
                inp.style.height = (inp.scrollHeight === 42 && inp.value.length < 30 ? 30 : inp.scrollHeight) + "px";
            });
        }
        return inp;
    };

    /*** @returns {string | number | null} */
    get dataDefault() {
        return null;
    };

    validate(v, submitting = true) {
        return true;
    };

    get componentHead() {
        if (this.type === Component.TEXT) return `<h2>${this.title}</h2>${this.image ? `<img src="${this.image}" style="max-width: 100%">` : ""}`;
        return `<div>${this.title}${this["required"] ? " <span style='color: #ff4040'>*</span>" : ""}</div><div class="error"></div>${this.image ? `<img src="${this.image}" style="max-width: 100%">` : ""}`;
    };

    /**
     * @param {HTMLDivElement} div
     * @param {Object} userSection
     * @param {boolean} isReadonly
     */
    htmlTo(div, userSection, isReadonly) {
        div.innerHTML = JSON.stringify(this.toJSON());
    };

    /**
     * @param {() => string | number | null} get
     * @param {(v: string | number | null) => void} set
     * @param {HTMLDivElement} div
     */
    saveTo(get, set, div) {
    };

    /*** @returns {Object<*, *>} */
    toJSON() {
        if (typeof this.id === "undefined") throw new Error("Component's 'id' was not defined.");
        if (typeof this.type === "undefined") throw new Error("Component's 'type' was not defined.");
        const obj = {};
        Object.keys(new ShortAnswerComponent()).forEach(k => k[0] !== "_" && (obj[k] = this[k]));
        return obj;
    };

    static fromJSON(json) {
        /*** @type {Component} */
        const component = new (Component.CLASSES[json.type])();
        Object.keys(component).forEach(k => k !== "type" && (component[k] = json[k]));
        return component;
    };
}

class TextComponent extends Component {
    type = Component.TEXT;

    /*** @type {string} */
    description = "";

    htmlTo(div, userSection, isReadonly) {
        div.innerHTML += this.componentHead;
    };

    /**
     * @param {string} description
     * @returns {TextComponent}
     */
    setDescription(description) {
        this.description = description;
        return this;
    };

    /**
     * @param {number} id
     * @returns {TextComponent}
     */
    setId(id) {
        this.id = id;
        return this;
    };

    /**
     * @param {string} title
     * @returns {TextComponent}
     */
    setTitle(title) {
        this.title = title;
        return this;
    };

    /**
     * @param {string | null} image
     * @returns {TextComponent}
     */
    setImage(image) {
        this.image = image;
        return this;
    };
}

class ShortAnswerComponent extends Component {
    type = Component.SHORT_ANSWER;

    /*** @type {string} */
    default = "";
    /*** @type {string} */
    placeholder = "";
    /*** @type {number} */
    min_length = 0;
    /*** @type {number} */
    max_length = 32;
    /*** @type {boolean} */
    required = false;

    htmlTo(div, userSection, isReadonly) {
        div.innerHTML += this.componentHead + "<br>";
        const inp = this.createInput(this);
        if (isReadonly) {
            inp.disabled = true;
            inp.readOnly = true;
        }
        inp.value = userSection[this.id];
        div.appendChild(inp);
    };

    saveTo(get, set, div) {
        set(div.querySelector("input").value);
    };

    get dataDefault() {
        return this.default;
    };

    validate(v, submitting = true) { // ""
        if (typeof v !== "string") return "Invalid.";
        if (v.length < (submitting ? this.min_length : 0) || v.length > this.max_length) return "The answer's length should be between " + (submitting ? this.min_length : 0) + "-" + this.max_length + ".";
        if (submitting && this.required && !v) return "This question is required.";
        return true;
    };

    /**
     * @param {string} default_
     * @returns {ShortAnswerComponent}
     */
    setDefault(default_) {
        this.default = default_;
        return this;
    };

    /**
     * @param {string} placeholder
     * @returns {ShortAnswerComponent}
     */
    setPlaceholder(placeholder) {
        this.placeholder = placeholder;
        return this;
    };

    /**
     * @param {number} min_length
     * @returns {ShortAnswerComponent}
     */
    setMinLength(min_length) {
        this.min_length = min_length;
        return this;
    };

    /**
     * @param {number} max_length
     * @returns {ShortAnswerComponent}
     */
    setMaxLength(max_length) {
        this.max_length = max_length;
        return this;
    };

    /**
     * @param {boolean} required
     * @returns {ShortAnswerComponent}
     */
    setRequired(required) {
        this.required = required;
        return this;
    };

    /**
     * @param {number} id
     * @returns {ShortAnswerComponent}
     */
    setId(id) {
        this.id = id;
        return this;
    };

    /**
     * @param {string} title
     * @returns {ShortAnswerComponent}
     */
    setTitle(title) {
        this.title = title;
        return this;
    };

    /**
     * @param {string | null} image
     * @returns {ShortAnswerComponent}
     */
    setImage(image) {
        this.image = image;
        return this;
    };
}

class ParagraphComponent extends Component {
    type = Component.PARAGRAPH;

    /*** @type {string} */
    default = "";
    /*** @type {string} */
    placeholder = "";
    /*** @type {number} */
    min_length = 0;
    /*** @type {number} */
    max_length = 4096;
    /*** @type {boolean} */
    required = false;

    htmlTo(div, userSection, isReadonly) {
        div.innerHTML += this.componentHead + "<br>";
        const inp = this.createInput(this, "textarea");
        if (isReadonly) {
            inp.disabled = true;
            inp.readOnly = true;
        }
        inp.value = userSection[this.id];
        div.appendChild(inp);
    };

    saveTo(get, set, div) {
        set(div.querySelector("textarea").value);
    };

    get dataDefault() {
        return this.default;
    };

    validate(v, submitting = true) { // ""
        if (typeof v !== "string") return "Invalid.";
        if (v.length < (submitting ? this.min_length : 0) || v.length > this.max_length) return "The answer's length should be between " + (submitting ? this.min_length : 0) + "-" + this.max_length + ".";
        if (submitting && this.required && !v) return "This question is required.";
        return true;
    };

    /**
     * @param {string} default_
     * @returns {ParagraphComponent}
     */
    setDefault(default_) {
        this.default = default_;
        return this;
    };

    /**
     * @param {string} placeholder
     * @returns {ParagraphComponent}
     */
    setPlaceholder(placeholder) {
        this.placeholder = placeholder;
        return this;
    };

    /**
     * @param {number} min_length
     * @returns {ParagraphComponent}
     */
    setMinLength(min_length) {
        this.min_length = min_length;
        return this;
    };

    /**
     * @param {number} max_length
     * @returns {ParagraphComponent}
     */
    setMaxLength(max_length) {
        this.max_length = max_length;
        return this;
    };

    /**
     * @param {boolean} required
     * @returns {ParagraphComponent}
     */
    setRequired(required) {
        this.required = required;
        return this;
    };

    /**
     * @param {number} id
     * @returns {ParagraphComponent}
     */
    setId(id) {
        this.id = id;
        return this;
    };

    /**
     * @param {string} title
     * @returns {ParagraphComponent}
     */
    setTitle(title) {
        this.title = title;
        return this;
    };

    /**
     * @param {string | null} image
     * @returns {ParagraphComponent}
     */
    setImage(image) {
        this.image = image;
        return this;
    };
}

class MultipleChoiceComponent extends Component {
    type = Component.MULTIPLE_CHOICE;

    /*** @type {string[]} */
    choices = [];
    /*** @type {{default: string, min_length: number, placeholder: string, enabled: boolean, required: boolean, max_length: number}} */
    otherChoice = {
        enabled: false,
        default: "",
        placeholder: "",
        min_length: 4,
        max_length: 64,
        required: false
    };
    /*** @type {number} */
    default = -1; // -1 = none, -2 = other
    /*** @type {boolean} */
    required = false;

    htmlTo(div, userSection, isReadonly) {
        div.innerHTML += this.componentHead + "<br>";
        div.innerHTML += this.choices.map((choice, i) => `<div class="option">
    <div class="checkbox ${userSection[this.id].split(";")[0] * 1 === i ? "checkbox-on" : ""} ${isReadonly ? "checkbox-disabled" : ""}" data-component-type="${Component.MULTIPLE_CHOICE}"></div>
    <div class="text">${choice}</div>
</div>`).join("<br>");
        if (this.otherChoice.enabled) {
            div.innerHTML += "<br>";
            const d = document.createElement("div");
            d.classList.add("option");
            d.innerHTML = `
<div class="checkbox ${userSection[this.id].split(";")[0] * 1 === -2 ? "checkbox-on" : ""} ${isReadonly ? "checkbox-disabled" : ""}" data-component-type="${Component.MULTIPLE_CHOICE}"></div>
<div class="text">Other</div>`;
            const inp = this.createInput(this.otherChoice);
            if (isReadonly) {
                inp.disabled = true;
                inp.readOnly = true;
            }
            inp.style.marginTop = "-5px";
            inp.style.width = "calc(100% - 82px)";
            inp.style.marginLeft = "10px";
            inp.value = userSection[this.id].split(";").slice(1).join(";");
            d.appendChild(inp);
            div.appendChild(d);
        }
    };

    saveTo(get, set, div) {
        const options = Array.from(div.querySelectorAll(".option"));
        const index = options.findIndex(i => i.querySelector(".checkbox").classList.contains("checkbox-on"));
        const otherText = this.otherChoice.enabled ? options[options.length - 1].querySelector("input").value : "";

        set((this.otherChoice.enabled && index === options.length - 1 ? -2 : index) + ";" + otherText);
    };

    get dataDefault() {
        return this.default + ";" + this.otherChoice.default;
    };

    validate(v, submitting = true) { // value;other   DEF = -1;
        if (typeof v !== "string" || !v.includes(";")) return "Invalid.";
        const f = v.split(";")[0] * 1;
        if (f === -1 && submitting && this.required) return "This question is required.";
        if (f === -2) {
            const o = v.split(";").slice(1).join(";");
            if (!this.otherChoice.enabled) return "Other choice is not enabled.";
            if (o.length < (submitting ? this.otherChoice.min_length : 0) || o.length > this.otherChoice.max_length) return "The other answer's length should be between " + (submitting ? this.otherChoice.min_length : 0) + "-" + this.otherChoice.max_length + ".";
            if (submitting && this.otherChoice.required && !o) return "Other choice should not be empty.";
            return true;
        }
        if (f !== -1 && !Object.keys(this.choices).includes(f.toString())) return "Invalid.";
        return true;
    };

    /**
     * @param {string[]} choices
     * @returns {MultipleChoiceComponent}
     */
    setChoices(choices) {
        this.choices = choices;
        return this;
    };

    /**
     * @param {{default: string, min_length: number, placeholder: string, enabled: boolean, required: boolean, max_length: number}} otherChoice
     * @returns {MultipleChoiceComponent}
     */
    setOtherChoice(otherChoice) {
        this.otherChoice = otherChoice;
        return this;
    };

    /**
     * @param {number} default_
     * @returns {MultipleChoiceComponent}
     */
    setDefault(default_) {
        this.default = default_;
        return this;
    };

    /**
     * @param {boolean} required
     * @returns {MultipleChoiceComponent}
     */
    setRequired(required) {
        this.required = required;
        return this;
    };

    /**
     * @param {number} id
     * @returns {MultipleChoiceComponent}
     */
    setId(id) {
        this.id = id;
        return this;
    };

    /**
     * @param {string} title
     * @returns {MultipleChoiceComponent}
     */
    setTitle(title) {
        this.title = title;
        return this;
    };

    /**
     * @param {string | null} image
     * @returns {MultipleChoiceComponent}
     */
    setImage(image) {
        this.image = image;
        return this;
    };
}

class CheckboxesComponent extends Component {
    type = Component.CHECKBOXES;

    /*** @type {string[]} */
    checkboxes = [];
    /*** @type {{default: string, min_length: number, placeholder: string, enabled: boolean, required: boolean, max_length: number}} */
    otherCheckbox = {
        enabled: false,
        default: "",
        placeholder: "",
        min_length: 4,
        max_length: 64,
        required: false
    };
    /*** @type {number[]} */
    default = []; // -2 = other
    /*** @type {boolean} */
    required = false;

    htmlTo(div, userSection, isReadonly) {
        div.innerHTML += this.componentHead + "<br>";
        const checks = userSection[this.id].split(";")[0].split(",").filter(i => i).map(i => i * 1);
        const other = userSection[this.id].split(";").slice(1).join(";");
        div.innerHTML += this.checkboxes.map((choice, i) => `<div class="option">
    <div class="checkbox square ${checks.includes(i) ? "checkbox-on" : ""} ${isReadonly ? "checkbox-disabled" : ""}" data-component-type="${Component.CHECKBOXES}"></div>
    <div class="text">${choice}</div>
</div>`).join("<br>");
        if (this.otherCheckbox.enabled) {
            div.innerHTML += "<br>";
            const d = document.createElement("div");
            d.classList.add("option");
            d.innerHTML = `
<div class="checkbox square ${checks.includes(-2) ? "checkbox-on" : ""} ${isReadonly ? "checkbox-disabled" : ""}" data-component-type="${Component.CHECKBOXES}"></div>
<div class="text">Other</div>`;
            const inp = this.createInput(this.otherCheckbox);
            if (isReadonly) {
                inp.disabled = true;
                inp.readOnly = true;
            }
            inp.style.marginTop = "-5px";
            inp.style.width = "calc(100% - 82px)";
            inp.style.marginLeft = "10px";
            inp.value = other;
            d.appendChild(inp);
            div.appendChild(d);
        }
    };

    saveTo(get, set, div) {
        const options = Array.from(div.querySelectorAll(".option"));
        const indexes = options.map((i, j) => [i, j]).filter(i => i[0].querySelector(".checkbox").classList.contains("checkbox-on"));
        const otherText = this.otherCheckbox.enabled ? options[options.length - 1].querySelector("input").value : "";
        set(indexes.map(i => i[1]).map(i => this.otherCheckbox.enabled && i === options.length - 1 ? -2 : i).join(",") + ";" + otherText);
    };

    get dataDefault() {
        return this.default.join(",") + ";" + this.otherCheckbox.default;
    };

    validate(v, submitting = true) { // value.join(,);other   DEF = ;
        if (typeof v !== "string" || !v.includes(";")) return "Invalid.";
        const spl = v.split(";");
        const vals = spl[0].split(",").filter(i => i).map(i => i * 1);
        const other = spl.slice(1).join(";");
        if (vals.some(i => isNaN(i * 1) || (i !== -2 && !Object.keys(this.checkboxes).includes(i.toString())))) return "Invalid.";
        if (!vals.length && submitting && this.required) return "This question is required.";
        if (vals.includes(-2)) {
            if (!this.otherCheckbox.enabled) return "Other choice is not enabled.";
            if (other.length < (submitting ? this.otherCheckbox.min_length : 0) || other.length > this.otherCheckbox.max_length) return "The other answer's length should be between " + (submitting ? this.otherChoice.min_length : 0) + "-" + this.otherChoice.max_length + ".";
            if (submitting && this.otherCheckbox.required && !other) return "Other choice should not be empty.";
            return true;
        }
        return true;
    };

    /**
     * @param {string[]} checkboxes
     * @returns {CheckboxesComponent}
     */
    setCheckboxes(checkboxes) {
        this.checkboxes = checkboxes;
        return this;
    };

    /**
     * @param {{default: string, min_length: number, placeholder: string, enabled: boolean, required: boolean, max_length: number}} otherCheckbox
     * @returns {CheckboxesComponent}
     */
    setOtherCheckbox(otherCheckbox) {
        this.otherCheckbox = otherCheckbox;
        return this;
    };

    /**
     * @param {number[]} default_
     * @returns {CheckboxesComponent}
     */
    setDefault(default_) {
        this.default = default_;
        return this;
    };

    /**
     * @param {boolean} required
     * @returns {CheckboxesComponent}
     */
    setRequired(required) {
        this.required = required;
        return this;
    };

    /**
     * @param {number} id
     * @returns {CheckboxesComponent}
     */
    setId(id) {
        this.id = id;
        return this;
    };

    /**
     * @param {string} title
     * @returns {CheckboxesComponent}
     */
    setTitle(title) {
        this.title = title;
        return this;
    };

    /**
     * @param {string | null} image
     * @returns {CheckboxesComponent}
     */
    setImage(image) {
        this.image = image;
        return this;
    };
}

class DropdownComponent extends Component {
    type = Component.DROPDOWN;

    /*** @type {string[]} */
    choices = [];
    /*** @type {number} */
    default = -1; // -1 = none
    /*** @type {boolean} */
    required = false;

    get dataDefault() {
        return this.default;
    };

    validate(v, submitting = true) { // DEF = -1
        if (typeof v !== "number" || (v !== -1 && !Object.keys(this.choices).includes(v.toString()))) return "Invalid.";
        if (submitting && this.required && v === -1) return "This question is required.";
        return true;
    };

    /**
     * @param {string[]} choices
     * @returns {DropdownComponent}
     */
    setChoices(choices) {
        this.choices = choices;
        return this;
    };

    /**
     * @param {number} default_
     * @returns {DropdownComponent}
     */
    setDefault(default_) {
        this.default = default_;
        return this;
    };

    /**
     * @param {boolean} required
     * @returns {DropdownComponent}
     */
    setRequired(required) {
        this.required = required;
        return this;
    };

    /**
     * @param {number} id
     * @returns {DropdownComponent}
     */
    setId(id) {
        this.id = id;
        return this;
    };

    /**
     * @param {string} title
     * @returns {DropdownComponent}
     */
    setTitle(title) {
        this.title = title;
        return this;
    };

    /**
     * @param {string | null} image
     * @returns {DropdownComponent}
     */
    setImage(image) {
        this.image = image;
        return this;
    };
}

class FileUploadComponent extends Component {
    type = Component.FILE_UPLOAD;

    /*** @type {RegExp | null} */
    extensions = null;
    /*** @type {number} */
    min_files = 1;
    /*** @type {number} */
    max_files = 1;
    /**
     * @type {number}
     * @description Minimum total size in kilobytes.
     */
    min_total_size = 512;
    /**
     * @type {number}
     * @description Maximum total size in kilobytes.
     */
    max_total_size = 1024;
    /*** @type {boolean} */
    required = false;

    validate(v, submitting = true) {
        this.min_total_size = 20;
        return true; // TODO: check if file exists for both client/server side
    };

    /**
     * @param {RegExp | null} extensions
     * @returns {FileUploadComponent}
     */
    setExtensions(extensions) {
        this.extensions = extensions;
        return this;
    };

    /**
     * @param {number} min_files
     * @returns {FileUploadComponent}
     */
    setMinFiles(min_files) {
        this.min_files = min_files;
        return this;
    };

    /**
     * @param {number} max_files
     * @returns {FileUploadComponent}
     */
    setMaxFiles(max_files) {
        this.max_files = max_files;
        return this;
    };

    /**
     * @param {number} min_total_size
     * @returns {FileUploadComponent}
     */
    setMinTotalSize(min_total_size) {
        this.min_total_size = min_total_size;
        return this;
    };

    /**
     * @param {number} max_total_size
     * @returns {FileUploadComponent}
     */
    setMaxTotalSize(max_total_size) {
        this.max_total_size = max_total_size;
        return this;
    };

    /**
     * @param {boolean} required
     * @returns {FileUploadComponent}
     */
    setRequired(required) {
        this.required = required;
        return this;
    };

    /**
     * @param {number} id
     * @returns {FileUploadComponent}
     */
    setId(id) {
        this.id = id;
        return this;
    };

    /**
     * @param {string} title
     * @returns {FileUploadComponent}
     */
    setTitle(title) {
        this.title = title;
        return this;
    };

    /**
     * @param {string | null} image
     * @returns {FileUploadComponent}
     */
    setImage(image) {
        this.image = image;
        return this;
    };
}

class LinearScaleComponent extends Component {
    type = Component.LINEAR_SCALE;

    /*** @type {number} */
    default = -1;
    /*** @type {{from: number, to: number}} */
    range = {from: 1, to: 10};
    /*** @type {{from: string, to: string}} */
    text = {from: "", to: ""};
    /*** @type {boolean} */
    required = false;

    get dataDefault() {
        return this.default;
    };

    validate(v, submitting = true) {
        if (typeof v !== "number" || v !== Math.floor(v) || v < this.range.from || v > this.range.to) return "Invalid";
        if (submitting && v === -1 && this.required) return "This question is required.";
        return true;
    };

    /**
     * @param {number} default_
     * @returns {LinearScaleComponent}
     */
    setDefault(default_) {
        this.default = default_;
        return this;
    };

    /**
     * @param {{from: number, to: number}} range
     * @returns {LinearScaleComponent}
     */
    setRange(range) {
        this.range = range;
        return this;
    };

    /**
     * @param {{from: string, to: string}} text
     * @returns {LinearScaleComponent}
     */
    setText(text) {
        this.text = text;
        return this;
    };

    /**
     * @param {boolean} required
     * @returns {LinearScaleComponent}
     */
    setRequired(required) {
        this.required = required;
        return this;
    };

    /**
     * @param {number} id
     * @returns {LinearScaleComponent}
     */
    setId(id) {
        this.id = id;
        return this;
    };

    /**
     * @param {string} title
     * @returns {LinearScaleComponent}
     */
    setTitle(title) {
        this.title = title;
        return this;
    };

    /**
     * @param {string | null} image
     * @returns {LinearScaleComponent}
     */
    setImage(image) {
        this.image = image;
        return this;
    };
}

class MultipleChoiceGridComponent extends Component {
    type = Component.MULTIPLE_CHOICE_GRID;

    /*** @type {Object<number, number>} */
    default = {};
    /*** @type {string[]} */
    rows = [];
    /*** @type {string[]} */
    columns = [];
    /*** @type {boolean[]} */
    rowRequired = [];
    /*** @type {boolean} */
    required = false;

    get dataDefault() {
        // {row: col}
        return Object.keys(this.default).map(row => `${this.default[row]},${row}`).join(";");
    };

    validate(v, submitting = true) { // col,row;col,row;..    DEF = ""
        if (typeof v !== "string") return "Invalid.";
        const spl = v.split(";").map(i => i.split(",").map(j => j * 1));
        if (spl.some(i => i.some(j => isNaN(j * 1) || j < 0 || j !== Math.floor(j * 1)))) return "Invalid.";
        if (spl.some(i => i[0] >= this.columns.length || i[1] >= this.rows.length)) return "Invalid.";
        if (spl.some(i => spl.filter(k => i[1] === k[1]).length !== 1)) return "Invalid.";
        if (submitting && !spl.length && this.required) return "This question is required.";
        const r = this.rowRequired.some((i, j) => i && !spl.some(k => k[1] === j));
        if (submitting && r) return "The " + r + ". row is required."
        return true;
    };

    /**
     * @param {Object<number, number>} default_
     * @returns {MultipleChoiceGridComponent}
     */
    setDefault(default_) {
        this.default = default_;
        return this;
    };

    /**
     * @param {string[]} rows
     * @returns {MultipleChoiceGridComponent}
     */
    setRows(rows) {
        this.rows = rows;
        return this;
    };

    /**
     * @param {string[]} columns
     * @returns {MultipleChoiceGridComponent}
     */
    setColumns(columns) {
        this.columns = columns;
        return this;
    };

    /**
     * @param {boolean[]} rowRequired
     * @returns {MultipleChoiceGridComponent}
     */
    setRowRequired(rowRequired) {
        this.rowRequired = rowRequired;
        return this;
    };

    /**
     * @param {boolean} required
     * @returns {MultipleChoiceGridComponent}
     */
    setRequired(required) {
        this.required = required;
        return this;
    };

    /**
     * @param {number} id
     * @returns {MultipleChoiceGridComponent}
     */
    setId(id) {
        this.id = id;
        return this;
    };

    /**
     * @param {string} title
     * @returns {MultipleChoiceGridComponent}
     */
    setTitle(title) {
        this.title = title;
        return this;
    };

    /**
     * @param {string | null} image
     * @returns {MultipleChoiceGridComponent}
     */
    setImage(image) {
        this.image = image;
        return this;
    };
}

class CheckboxGridComponent extends Component {
    type = Component.CHECKBOX_GRID;

    /*** @type {[number, number][]}} */
    default = [];
    /*** @type {string[]} */
    rows = [];
    /*** @type {string[]} */
    columns = [];
    /*** @type {boolean[]} */
    rowRequired = [];
    /*** @type {boolean} */
    required = false;

    get dataDefault() {
        return this.default.map(i => i.join(",")).join(";");
    };

    validate(v, submitting = true) { // col,row;col,row;   DEF = ""
        if (typeof v !== "string") return "Invalid.";
        const spl = v.split(";").map(i => i.split(",").map(j => j * 1));
        if (spl.some(i => i.some(j => isNaN(j * 1) || j < 0 || j !== Math.floor(j * 1)))) return "Invalid.";
        if (spl.some(i => i[0] >= this.columns.length || i[1] >= this.rows.length)) return "Invalid.";
        if (submitting && !spl.length && this.required) return "This question is required.";
        const r = this.rowRequired.some((i, j) => i && !spl.some(k => k[1] === j));
        if (submitting && r) return "The " + r + ". row is required."
        return true;
    };

    /**
     * @param {[number, number][]} default_
     * @returns {CheckboxGridComponent}
     */
    setDefault(default_) {
        this.default = default_;
        return this;
    };

    /**
     * @param {string[]} rows
     * @returns {CheckboxGridComponent}
     */
    setRows(rows) {
        this.rows = rows;
        return this;
    };

    /**
     * @param {string[]} columns
     * @returns {CheckboxGridComponent}
     */
    setColumns(columns) {
        this.columns = columns;
        return this;
    };

    /**
     * @param {boolean[]} rowRequired
     * @returns {CheckboxGridComponent}
     */
    setRowRequired(rowRequired) {
        this.rowRequired = rowRequired;
        return this;
    };

    /**
     * @param {boolean} required
     * @returns {CheckboxGridComponent}
     */
    setRequired(required) {
        this.required = required;
        return this;
    };

    /**
     * @param {number} id
     * @returns {CheckboxGridComponent}
     */
    setId(id) {
        this.id = id;
        return this;
    };

    /**
     * @param {string} title
     * @returns {CheckboxGridComponent}
     */
    setTitle(title) {
        this.title = title;
        return this;
    };

    /**
     * @param {string | null} image
     * @returns {CheckboxGridComponent}
     */
    setImage(image) {
        this.image = image;
        return this;
    };
}

class DateComponent extends Component {
    type = Component.DATE;

    /*** @type {{month: number, year: number, day: number}} */
    default = {
        day: -1,
        month: -1,
        year: -1
    };
    required = false;

    get dataDefault() {
        return this.default.day + ";" + this.default.month + ";" + this.default.year;
    };

    validate(v, submitting = true) { // day;month;year   DEF = -1;-1;-1
        if (typeof v !== "string") return "Invalid.";
        const spl = v.split(";").map(i => i * 1);
        if (spl.length !== 3 || spl.some(isNaN)) return "Invalid.";
        if (v === "-1;-1;-1" && (!this.required || !submitting)) return true;
        if (submitting && v === "-1;-1;-1" && this.required) return "This question is required.";
        const date = new Date(spl[2] * 1, spl[1] - 1, spl[0] * 1);
        if (date.getFullYear() !== spl[2] || date.getMonth() !== spl[1] || date.getDate() !== spl[0]) return "Invalid date.";
        return true;
    };

    /**
     * @param {{month: number, year: number, day: number}} default_
     * @returns {DateComponent}
     */
    setDefault(default_) {
        this.default = default_;
        return this;
    };

    /**
     * @param {boolean} required
     * @returns {DateComponent}
     */
    setRequired(required) {
        this.required = required;
        return this;
    };

    /**
     * @param {number} id
     * @returns {DateComponent}
     */
    setId(id) {
        this.id = id;
        return this;
    };

    /**
     * @param {string} title
     * @returns {DateComponent}
     */
    setTitle(title) {
        this.title = title;
        return this;
    };

    /**
     * @param {string | null} image
     * @returns {DateComponent}
     */
    setImage(image) {
        this.image = image;
        return this;
    };
}

class TimeComponent extends Component {
    type = Component.TIME;

    /*** @type {{hours: number, minutes: number, format: string}} */
    default = {
        minutes: -1,
        hours: -1,
        format: "AM"
    };
    required = false;

    get dataDefault() {
        return this.default.minutes + ";" + this.default.hours + ";" + {AM: 0, PM: 1}[this.default.format];
    };

    validate(v, submitting = true) { // minutes;hours;format   DEF = -1;-1;0
        if (typeof v !== "string") return "Invalid.";
        const spl = v.split(";").map(i => i * 1);
        if (spl.length !== 3 || spl.some(isNaN)) return "Invalid.";
        if (v.startsWith("-1;-1;") && (!this.required || !submitting)) return true;
        if (submitting && v.startsWith("-1;-1;") && this.required) return "This question is required.";
        const date = new Date(0, 0, 0, spl[1] * 1, spl[0] * 1);
        if (date.getDate() || date.getMinutes() !== spl[0] || date.getHours() !== spl[1]) return "Invalid time.";
        return true;
    };

    /**
     * @param {{hours: number, minutes: number, format: string}} default_
     * @returns {TimeComponent}
     */
    setDefault(default_) {
        this.default = default_;
        return this;
    };

    /**
     * @param {boolean} required
     * @returns {TimeComponent}
     */
    setRequired(required) {
        this.required = required;
        return this;
    };

    /**
     * @param {number} id
     * @returns {TimeComponent}
     */
    setId(id) {
        this.id = id;
        return this;
    };

    /**
     * @param {string} title
     * @returns {TimeComponent}
     */
    setTitle(title) {
        this.title = title;
        return this;
    };

    /**
     * @param {string | null} image
     * @returns {TimeComponent}
     */
    setImage(image) {
        this.image = image;
        return this;
    };
}

class VideoComponent extends Component {
    type = Component.VIDEO;

    /*** @type {string} */
    url = "";

    /**
     * @param {string} url
     * @returns {VideoComponent}
     */
    setURL(url) {
        this.url = url;
        return this;
    };

    /**
     * @param {number} id
     * @returns {VideoComponent}
     */
    setId(id) {
        this.id = id;
        return this;
    };

    /**
     * @param {string} title
     * @returns {VideoComponent}
     */
    setTitle(title) {
        this.title = title;
        return this;
    };

    /**
     * @param {string | null} image
     * @returns {VideoComponent}
     */
    setImage(image) {
        this.image = image;
        return this;
    };
}

Component.CLASSES = {
    [Component.SHORT_ANSWER]: ShortAnswerComponent,
    [Component.PARAGRAPH]: ParagraphComponent,
    [Component.MULTIPLE_CHOICE]: MultipleChoiceComponent,
    [Component.CHECKBOXES]: CheckboxesComponent,
    [Component.DROPDOWN]: DropdownComponent,
    [Component.FILE_UPLOAD]: FileUploadComponent,
    [Component.LINEAR_SCALE]: LinearScaleComponent,
    [Component.MULTIPLE_CHOICE_GRID]: MultipleChoiceGridComponent,
    [Component.CHECKBOX_GRID]: CheckboxGridComponent,
    [Component.DATE]: DateComponent,
    [Component.TIME]: TimeComponent,
    [Component.TEXT]: TextComponent,
    [Component.VIDEO]: VideoComponent
};

const exporting = [
    Application,
    Section,
    Component,
    TextComponent,
    ShortAnswerComponent,
    ParagraphComponent,
    MultipleChoiceComponent,
    CheckboxesComponent,
    DropdownComponent,
    FileUploadComponent,
    LinearScaleComponent,
    MultipleChoiceGridComponent,
    CheckboxGridComponent,
    DateComponent,
    TimeComponent,
    VideoComponent
];

if (typeof global !== "undefined") exporting.forEach(i => global[i.constructor.name] = i);