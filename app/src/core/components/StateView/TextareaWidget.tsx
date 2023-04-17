import React from "react";

import { WidgetProps } from "@rjsf/core";

import TextField from "@material-ui/core/TextField";

type CustomWidgetProps = WidgetProps & {
    options: any;
};

/**
 * Copied from: https://github.com/rjsf-team/react-jsonschema-form/blob/master/packages/material-ui/src/TextareaWidget/TextareaWidget.tsx
 *
 * After submitting a command form in a modal, state view gets updated but textarea labels don't shrink.
 * A reload fixes the problem, but that's no solution.
 * Material-UI lists the problem in the docs: https://material-ui.com/components/text-fields/#shrink
 *
 * Hence, we override the TextareaWidget to apply the suggested optimization and force shrink via InputLabelProps
 */
const TextareaWidget = ({
                            id,
                            placeholder,
                            value,
                            required,
                            disabled,
                            autofocus,
                            label,
                            readonly,
                            onBlur,
                            onFocus,
                            onChange,
                            options,
                            schema,
                            rawErrors = [],
                        }: CustomWidgetProps) => {
    const _onChange = ({
                           target: { value },
                       }: React.ChangeEvent<HTMLInputElement>) =>
        onChange(value === "" ? options.emptyValue : value);
    const _onBlur = ({ target: { value } }: React.FocusEvent<HTMLInputElement>) =>
        onBlur(id, value);
    const _onFocus = ({
                          target: { value },
                      }: React.FocusEvent<HTMLInputElement>) => onFocus(id, value);

    return (
        <TextField
            id={id}
    label={label || schema.title}
    placeholder={placeholder}
    disabled={disabled || readonly}
    value={value}
    required={required}
    autoFocus={autofocus}
    multiline={true}
    rows={options.rows || 5}
    error={rawErrors.length > 0}
    onChange={_onChange}
    onBlur={_onBlur}
    onFocus={_onFocus}
    InputLabelProps={{shrink: !!(value && value != "")}}
    />
);
};

export default TextareaWidget;
