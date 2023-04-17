import React, {useEffect, useImperativeHandle, useRef, useState} from 'react';
import {CommandDescription} from '../types';
import {Container, Grid} from '@material-ui/core';
import {useDispatch, useSelector} from 'react-redux';
import {makeCommandErrorSelector, makeCommandResponseSelector} from '../selector/commandSelector';
import Form, {FieldTemplate, ObjectFieldTemplate} from "@rjsf/material-ui";
import {clearCommand, executeCommand} from "../action/commandCommands";
import {ArrayFieldTemplateProps, Field, ISubmitEvent} from "@rjsf/core";
import {Widgets} from "@rjsf/material-ui";
import {v4} from "uuid";
import AxiosResponseViewer from "./AxiosResponseViewer";
import {Alert, AlertTitle} from "@material-ui/lab";
import ArrayItemObjectFieldTemplate from "./CommandForm/ArrayItemObjectFieldTemplate";
import ArrayFieldTemplate from "./CommandForm/ArrayFieldTemplate";
import TextWidget from "./CommandForm/TextWidget";
import {Logger} from "../util/Logger";
import {Widget} from "react-jsonschema-form";

interface CommandFormProps {
    command: CommandDescription;
    onBeforeSubmitting?: (formData: {[prop: string]: any}) => {[prop: string]: any};
    onSubmitted?: () => void;
    onResponseReceived?: () => void;
    onBackendErrorReceived?: () => void;
    onValidationError?: () => void;
    onChange?: () => void;
    formData?: {[prop: string]: any};
    objectFieldTemplate?: typeof ObjectFieldTemplate;
    arrayFieldTemplate?: React.FunctionComponent<ArrayFieldTemplateProps>;
    fieldTemplate?: typeof FieldTemplate;
    widgets?: {[name: string]: Widget};
    fields?: {[name: string]: Field};
}

const CommandForm = (props: CommandFormProps, ref: any) => {

    const dispatch = useDispatch();
    const response = useSelector(makeCommandResponseSelector());
    const error = useSelector(makeCommandErrorSelector());
    let formRef: any = useRef();
    let formData: {[prop: string]: any} = {};
    const [liveValidate, setLiveValidate] = useState(false);
    const [submittedFormData, setSubmittedFormData] = useState<{[prop: string]: any}>();

    useImperativeHandle(ref, () => ({
        submit: (): void => {
            setLiveValidate(true);
            setSubmittedFormData(formRef.state.formData)
            formRef.submit();
        },
    }));

    useEffect(() => {
        dispatch(clearCommand({}));
    }, [dispatch]);

    useEffect(() => {
        if(error && props.onBackendErrorReceived) {
            props.onBackendErrorReceived();
            return;
        }

        if(response && props.onResponseReceived) {
            props.onResponseReceived();
        }
    }, [response, error])

    const handleValidationError = (error: any) => {
        Logger.error('Validation failed: ', error, 'current formData: ', formData);

        if(props.onValidationError) {
            props.onValidationError();
        }
    }

    const handleChange = () => {
        if(props.onChange) {
            props.onChange();
        }
    }

    const handleSubmit = (e: ISubmitEvent<any>) => {
        let formData = e.formData;
        if(props.onBeforeSubmitting) {
            formData = props.onBeforeSubmitting(e.formData);
        }
        dispatch(executeCommand({ commandName: props.command.commandName, payload: formData }));
        setLiveValidate(false);
        if(props.onSubmitted) {
            props.onSubmitted();
        }
    }

    if(props.command.createAggregate && props.command.aggregateIdentifier) {
        formData[props.command.aggregateIdentifier] = v4();
    }

    if(props.formData) {
        formData = {...formData, ...props.formData};
    }

    if(submittedFormData) {
        formData = submittedFormData;
    }

    const widgets = props.widgets || {};

    return (
        <div>
            <Grid container={true} spacing={3}>
                <Grid item={true} md={12}>
                    {!response && !error && <Form
                        schema={props.command.schema}
                        children={<></>}
                        // @ts-ignore
                        ref={(form) => formRef = form}
                        onSubmit={handleSubmit}
                        formData={formData}
                        formContext={formData}
                        uiSchema={props.command.uiSchema}
                        liveValidate={liveValidate}
                        showErrorList={false}
                        onError={handleValidationError}
                        onChange={handleChange}
                        ObjectFieldTemplate={props.objectFieldTemplate? props.objectFieldTemplate : ArrayItemObjectFieldTemplate}
                        ArrayFieldTemplate={props.arrayFieldTemplate? props.arrayFieldTemplate : ArrayFieldTemplate}
                        widgets={
                            {
                                DynamicEnum: Widgets.SelectWidget,
                                // @ts-ignore
                                TextWidget: TextWidget,
                                ...widgets
                            }
                        }
                        fields={props.fields}
                    />}
                    {(response || error) && <div>
                        {response && <AxiosResponseViewer response={response} successMessageCreated={<Alert severity={'success'}>
                            <AlertTitle>{props.command.schema.title || props.command.commandName} was successful</AlertTitle>
                        </Alert>}/>}
                        {!response && error && (
                            <Container disableGutters={true}>
                                <Alert severity={'error'}>
                                    <AlertTitle>{error.name}</AlertTitle>
                                    {error.message}
                                </Alert>
                            </Container>
                        )}
                    </div>}
                </Grid>
            </Grid>
        </div>
    );
};

export default React.forwardRef(CommandForm);
