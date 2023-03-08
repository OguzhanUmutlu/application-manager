# application-manager

The perfect way to review your applications. A private application manager.

## Setup

- Download the repository and extract to a folder.
- You are pretty much done!

## Running

### Windows

- Click the `run.cmd` file and that's it!

### Linux or Mac

- Open a terminal
- Use `cd DIRECTORY_NAME_HERE` to locate to your directory
- Use `chmod +x run.sh` to be able to run the script
- Type `./run.sh` and that's it!

## Editing applications

- You can edit applications in the `apps.js` file!
- A separate application will be done in the future!

## Steps to add a custom component

- Open `utils.js`
- Search for `class Component {` using CTRL F
- Add a new component id to the enum list
    - For example: `static MY_COMPONENT = 123;`
- Add the class of your component
    - Template:

```js
class MyCustomComponent extends Component {
    type = Component.MY_COMPONENT;

    // If a property like this starts with _ it means it is private and won't be shared with the client.
    _example = "Hello!";
    
    htmlTo(div, userSection, isReadonly) {
        div.innerHTML += this.componentHead + "<br>This is a component!";
    };

    saveTo(get, set, div) {
        set("my value!");
    };

    get dataDefault() {
        return "default value!";
    };

    validate(v, submitting = true) {
        // Validate if the value is valid or not! True means it is valid, string means it is invalid
        if (v === "an invalid value") return "This is a warning message. The value shouldn't be `an invalid value`!";
        return true;
    };
}
```

- Search for `Component.CLASSES = {` using CTRL F
- Add your class
    - For example: `[Component.MY_COMPONENT]: MyCustomComponent`
- Search for `const exporting = [` using CTRL F
- Add your class
    - For example: `, MyCustomComponent`


- **You are done! Now you can use your component in your forms!**