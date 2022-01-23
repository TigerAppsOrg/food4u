const notyf = new Notyf({
    duration: 10000,
    dismissible: true,
    position: {
        x: 'right',
        y: 'bottom',
    },
    types: [
        {
            type: 'warning',
            background: 'orange',
            icon: {
                className: 'material-icons',
                tagName: 'span',
                text: 'warning'
            },
            duration: 10000,
            dismissible: true
        },
        // {
        //     type: 'error',
        //     background: 'indianred',
        //     duration: 30000,
        //     dismissible: true
        // }
        {
            type: 'new-food',
            position: {
                x: 'right',
                y: 'bottom',
            },
            background: '#f58025',
            icon: {
                className: 'material-icons',
                tagName: 'span',
                text: 'restaurant'
            },
            duration: 10000,
            dismissible: true
        },
    ]
});
