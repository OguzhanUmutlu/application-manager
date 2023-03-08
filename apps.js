module.exports = [
    new Application()
        .setId(1)
        .setName("Application")
        .addSection(new Section()
            .setId(2)
            .addComponent(
                new TextComponent()
                    .setId(3)
                    .setTitle("Title")
                    .setImage("https://cdn.neowin.com/news/images/uploaded/2021/04/1619644762_github-desktop_story.jpg"),
                new CheckboxesComponent()
                    .setId(4)
                    .setTitle("Short Answer")
                    .setCheckboxes([
                        "Checkbox 1",
                        "Checkbox 2",
                        "Checkbox 3"
                    ])
                    .setRequired(true)
                    .setOtherCheckbox({
                        default: "",
                        min_length: 4,
                        max_length: 16,
                        placeholder: "Your answer",
                        enabled: true,
                        required: false
                    }),
                new MultipleChoiceComponent()
                    .setId(5)
                    .setTitle("Short Answer")
                    .setChoices([
                        "Checkbox 1",
                        "Checkbox 2",
                        "Checkbox 3"
                    ])
                    .setRequired(true)
                    .setOtherChoice({
                        default: "",
                        min_length: 4,
                        max_length: 16,
                        placeholder: "Your answer",
                        enabled: true,
                        required: false
                    })
            )
        )
]