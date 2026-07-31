export function validateField(value, rules = {}) {

    const errors = [];
    const normalizedValue = String(value ?? "").trim();


    if (rules.required && normalizedValue === "") {
        errors.push("This field is required");
    }


    if (rules.minLength && normalizedValue.length < rules.minLength) {
        errors.push(`Minimum length is ${rules.minLength}`);
    }


    if (rules.regex && normalizedValue !== "" && !rules.regex.test(normalizedValue)) {
        errors.push("Invalid format");
    }


    return errors;

}


export function validateForm(values, rulesMap) {

    const errors = {};


    Object.entries(rulesMap).forEach(([fieldName, rules]) => {

        const fieldErrors = validateField(values[fieldName], rules);

        if (fieldErrors.length > 0) {
            errors[fieldName] = fieldErrors;
        }

    });


    return errors;

}


export function getErrorText(errors = []) {

    return errors.length > 0 ? errors[0] : "";

}