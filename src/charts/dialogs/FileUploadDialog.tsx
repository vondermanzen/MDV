import type React from "react";
import {
    useState,
    useCallback,
    useReducer,
    type PropsWithChildren,
    forwardRef,
} from "react";
import { useDropzone } from "react-dropzone";
import { observer } from "mobx-react-lite";

import axios from "axios";
import { useProject } from "../../modules/ProjectContext";
import { ColumnPreview } from "./ColumnPreview";

import {
    useViewerStoreApi,
    useChannelsStoreApi,
} from "../../react/components/avivatorish/state";
import { createLoader } from "../../react/components/avivatorish/utils";
import { unstable_batchedUpdates } from "react-dom";

import { TiffPreview } from "./TiffPreview";
import { TiffMetadataTable } from "./TiffMetadataTable";
import TiffVisualization from "./TiffVisualization";
import { DatasourceDropdown } from "./DatasourceDropdown";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

// Use dynamic import for the worker
const CsvWorker = new Worker(new URL("./csvWorker.ts", import.meta.url), {
    type: "module",
});

const Container = ({ children }: PropsWithChildren) => {
    return (
        <div className="flex flex-col content-center items-center h-max dark:bg-black-800 dark:text-white">
            {children}
        </div>
    );
};

const StatusContainer = ({ children }: PropsWithChildren) => {
    return (
        <div className="flex flex-col justify-center items-center w-full h-150 dark:bg-#333">
            {children}
        </div>
    );
};

const SuccessContainer = ({ children }) => (
    <div className="flex flex-col items-center justify-center bg-[#f0f8ff] shadow-md border border-[#e0e0e0] m-4 dark:bg-black dark:border-gray-600">
        {children}
    </div>
);

const SuccessHeading = ({ children }) => (
    <h1 className="text-[#333] mb-1 dark:text-white">{children}</h1>
);

const SuccessText = ({ children }) => (
    <p className="text-2xl text-[#555] mb-3 text-center dark:text-gray-300">
        {children}
    </p>
);

const DropzoneContainer = forwardRef(
    ({ isDragOver, children, ...props }: any, ref) => (
        <div
            {...props}
            ref={ref}
            className={`p-4 mt-2 z-50 text-center border-2 border-dashed rounded-lg ${isDragOver ? "bg-gray-300 dark:bg-slate-800" : "bg-white dark:bg-black"} min-w-[90%]`}
        >
            {children}
        </div>
    ),
);

const FileInputLabel = ({ children, ...props }) => (
    <label
        {...props}
        className="mt-8 px-5 py-2.5 border bg-stone-200 hover:bg-stone-300 rounded cursor-pointer inline-block my-2.5 dark:bg-stone-600 dark:hover:bg-stone-500"
    >
        {children}
    </label>
);

const Spinner = () => {
    return (
        <div
            className="w-16 h-16 border-8 mt-10 border-blue-500 border-dashed rounded-full animate-spin"
            style={{
                borderColor: "blue transparent blue transparent",
            }}
        />
    );
};

const colorStyles = {
    blue: {
        bgColor: "bg-blue-600",
        hoverColor: "hover:bg-blue-700",
        darkBgColor: "dark:bg-blue-800",
        darkHoverColor: "dark:bg-blue-900",
    },
    red: {
        bgColor: "bg-red-600",
        hoverColor: "hover:bg-red-700",
        darkBgColor: "dark:bg-red-800",
        darkHoverColor: "dark:bg-red-900",
    },
    green: {
        bgColor: "bg-green-600",
        hoverColor: "hover:bg-green-700",
        darkBgColor: "dark:bg-green-800",
        darkHoverColor: "dark:bg-green-900",
    },
    gray: {
        bgColor: "bg-gray-600",
        hoverColor: "hover:bg-gray-700",
        darkBgColor: "dark:bg-gray-800",
        darkHoverColor: "dark:bg-gray-900",
    },
};

const Button = ({
    onClick,
    color = "blue",
    disabled = false,
    size = "px-5 py-2.5",
    marginTop = "mt-2.5",
    children,
}) => {
    const { bgColor, hoverColor, darkBgColor, darkHoverColor } =
        colorStyles[color] || colorStyles.blue;

    return (
        <button
            type="button"
            onClick={onClick}
            className={`${size} ${marginTop} ${bgColor} ${hoverColor} ${darkBgColor} ${darkHoverColor} text-white rounded self-center cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-500 disabled:opacity-70`}
            disabled={disabled}
        >
            {children}
        </button>
    );
};

const ProgressBar = ({ value, max }) => (
    <progress
        className="w-full h-8 mb-5 mt-10 bg-gray-200 dark:bg-white-200 border border-gray-300 rounded"
        value={value}
        max={max}
    />
);

const Message = ({ children }) => (
    <p className="text-lg font-bold text-[#333] dark:text-white text-center">
        {children}
    </p>
);

const FileSummary = ({ children }) => (
    <div className="max-w-[800px] w-[100%] text-center mb-5">{children}</div>
);

const FileSummaryHeading = ({ children }) => (
    <h1 className="text-gray-800 dark:text-white mb-3">{children}</h1>
);

const FileSummaryText = ({ children }) => (
    <>
        {typeof children === 'string' ? (
            <p className="text-lg text-gray-700 dark:text-white my-1">
                {children}
            </p>
        ) : (
            <div className="text-lg text-gray-700 dark:text-white my-1">
                {children}
            </div>
        )}
    </>
);

const ErrorContainer = ({ children }) => (
    <div className="bg-[#fff0f0] text-[#d8000c] border border-[#ffbaba] p-5 my-5 rounded shadow-sm text-left w-[90%] max-w-[600px]">
        {children}
    </div>
);

const DynamicText = ({ text, className = "" }) => (
    <div className="w-96 h-20 overflow-hidden flex items-center justify-center">
        <p
            className={`text-center m-0 font-bold text-sm sm:text-lg md:text-m ${className}`}
        >
            {text}
        </p>
    </div>
);

const ErrorHeading = ({ children }) => (
    <h4 className="mt-0 text-lg font-bold">{children}</h4>
);

const DatasourceNameInput = ({ value, onChange, isDisabled }) => (
    <div className="flex-left items-center space-x-2 pr-4">
        <label className="text-lg text-gray-700 dark:text-white my-1">
            <strong>Datasouce Name:</strong>
        </label>
        <input
            id="datasourceName"
            type="text"
            value={value}
            onChange={onChange}
            className="p-2 border rounded focus:outline-none focus:ring focus:border-blue-300 dark:text-gray-300 dark:bg-gray-800 flex-grow"
            placeholder="Enter datasource name"
            disabled={isDisabled}
        />
    </div>
);

// Reducer function
const reducer = (state, action) => {
    switch (action.type) {
        case "SET_SELECTED_FILES":
            return { ...state, selectedFiles: action.payload };
        case "SET_IS_UPLOADING":
            return { ...state, isUploading: action.payload };
        case "SET_IS_INSERTING":
            return { ...state, isInserting: action.payload };
        case "SET_SUCCESS":
            return { ...state, success: action.payload };
        case "SET_ERROR":
            return { ...state, error: action.payload };
        case "SET_IS_VALIDATING":
            return { ...state, isValidating: action.payload };
        case "SET_VALIDATION_RESULT":
            return { ...state, validationResult: action.payload };
        case "SET_FILE_TYPE":
            return { ...state, fileType: action.payload };
        case "SET_TIFF_METADATA":
            return { ...state, tiffMetadata: action.payload };
        default:
            return state;
    }
};

// Constants
const UPLOAD_INTERVAL = 30;
const UPLOAD_DURATION = 3000;
const UPLOAD_STEP = 100 / (UPLOAD_DURATION / UPLOAD_INTERVAL);

interface FileUploadDialogComponentProps {
    onClose: () => void;
    onResize: (width: number, height: number) => void; // Add this prop
}

// Custom hook for file upload progress
const useFileUploadProgress = () => {
    const [progress, setProgress] = useState(0);

    const startProgress = useCallback(() => {
        setProgress(0);
        const interval = setInterval(() => {
            setProgress((prevProgress) => {
                const updatedProgress = prevProgress + UPLOAD_STEP;
                if (updatedProgress >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return updatedProgress;
            });
        }, UPLOAD_INTERVAL);
    }, []);

    const resetProgress = useCallback(() => {
        setProgress(0);
    }, []);

    return { progress, setProgress, startProgress, resetProgress };
};

const FileUploadDialogComponent: React.FC<FileUploadDialogComponentProps> = ({
    onClose,
    onResize,
}) => {
    const { root, projectName, chartManager } = useProject();

    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    const [updatedNamesArray, setUpdatedNamesArray] = useState<string[]>([]);

    const handleSelect = (value: string) => {
        setSelectedOption(value);
        setDatasourceName(value);
        console.log("Selected:", value);
    };

    const [datasourceName, setDatasourceName] = useState("");

    const [showMetadata, setShowMetadata] = useState(true);

    const toggleView = () => {
        setShowMetadata((prevState) => !prevState);
    };

    const [csvSummary, setCsvSummary] = useState({
        datasourceName: "",
        fileName: "",
        fileSize: "",
        rowCount: 0,
        columnCount: 0,
    });

    const [tiffSummary, settiffSummary] = useState({
        fileName: "",
        fileSize: "",
    });

    const [columnNames, setColumnNames] = useState<string[]>([]);
    const [columnTypes, setColumnTypes] = useState<string[]>([]);
    const [secondRowValues, setSecondRowValues] = useState<string[]>([]);

    // TIFF
    const channelsStore = useChannelsStoreApi();

    const [state, dispatch] = useReducer(reducer, {
        selectedFiles: [],
        isUploading: false,
        isInserting: false,
        isValidating: false,
        validationResult: null,
        success: false,
        error: null,
        fileType: null,
        tiffMetadata: null,
    });

    const viewerStore = useViewerStoreApi();

    const { progress, resetProgress, setProgress } = useFileUploadProgress();

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length > 0) {
                const file = acceptedFiles[0];
                dispatch({
                    type: "SET_SELECTED_FILES",
                    payload: acceptedFiles,
                });
                const fileExtension = file.name.split(".").pop().toLowerCase();

                // Common logic for both CSV and TIFF files
                if (fileExtension === "csv") {
                    const newDatasourceName = file.name;
                    setDatasourceName(newDatasourceName);
                    setCsvSummary({
                        ...csvSummary,
                        datasourceName: newDatasourceName,
                        fileName: file.name,
                        fileSize: (file.size / (1024 * 1024)).toFixed(2),
                    });
                    dispatch({ type: "SET_FILE_TYPE", payload: "csv" });
                } else if (
                    fileExtension === "tiff" ||
                    fileExtension === "tif"
                ) {
                    const dataSources =
                        window.mdv.chartManager?.dataSources ?? [];
                    const namesArray = dataSources.map(
                        (dataSource) => dataSource.name,
                    );

                    // Update state with the new array, triggering re-render
                    setUpdatedNamesArray([...namesArray, "new datasource"]);
                    settiffSummary({
                        ...tiffSummary,
                        fileName: file.name,
                        fileSize: (file.size / (1024 * 1024)).toFixed(2),
                    });
                    dispatch({ type: "SET_FILE_TYPE", payload: "tiff" });
                    handleSubmitFile(acceptedFiles);
                }

                // Start validation after dispatching file type
                dispatch({ type: "SET_IS_VALIDATING", payload: true });

                if (fileExtension === "csv") {
                    CsvWorker.postMessage(file);
                    CsvWorker.onmessage = (event: MessageEvent) => {
                        const {
                            columnNames,
                            columnTypes,
                            secondRowValues,
                            rowCount,
                            columnCount,
                            error,
                        } = event.data;
                        if (error) {
                            dispatch({
                                type: "SET_ERROR",
                                payload: {
                                    message: "Validation failed.",
                                    traceback: error,
                                },
                            });
                            dispatch({
                                type: "SET_IS_VALIDATING",
                                payload: false,
                            });
                        } else {
                            setColumnNames(columnNames);
                            setColumnTypes(columnTypes);
                            setSecondRowValues(secondRowValues);
                            setCsvSummary((prevCsvSummary) => ({
                                ...prevCsvSummary,
                                rowCount,
                                columnCount,
                            }));

                            const totalWidth = calculateTotalWidth(
                                columnNames,
                                columnTypes,
                                secondRowValues,
                            );
                            onResize(totalWidth, 745);
                            dispatch({
                                type: "SET_IS_VALIDATING",
                                payload: false,
                            });
                            dispatch({
                                type: "SET_VALIDATION_RESULT",
                                payload: { columnNames, columnTypes },
                            });
                        }
                    };
                } else if (fileExtension === "tiff") {
                    onResize(1032, 580);
                    dispatch({ type: "SET_IS_VALIDATING", payload: false });
                    dispatch({
                        type: "SET_VALIDATION_RESULT",
                        payload: { columnNames, columnTypes },
                    });
                }
            }
        },
        [csvSummary, tiffSummary],
    );

    const handleSubmitFile = useCallback(
        async (files: File[]) => {
            let newSource;
            if (files.length === 1) {
                newSource = {
                    urlOrFile: files[0],
                    description: files[0].name,
                };
            } else {
                newSource = {
                    urlOrFile: files,
                    description: "data.zarr",
                };
            }

            viewerStore.setState({ isChannelLoading: [true] });
            viewerStore.setState({ isViewerLoading: true });

            try {
                const newLoader = await createLoader(
                    newSource.urlOrFile,
                    () => {}, // placeholder for toggleIsOffsetsSnackbarOn
                    (message) =>
                        viewerStore.setState({
                            loaderErrorSnackbar: { on: true, message },
                        }),
                );

                let nextMeta;
                let nextLoader;
                if (Array.isArray(newLoader)) {
                    if (newLoader.length > 1) {
                        nextMeta = newLoader.map((l) => l.metadata);
                        nextLoader = newLoader.map((l) => l.data);
                    } else {
                        nextMeta = newLoader[0].metadata;
                        nextLoader = newLoader[0].data;
                    }
                } else {
                    nextMeta = newLoader.metadata;
                    nextLoader = newLoader.data;
                }

                if (nextLoader) {
                    console.log(
                        "Metadata (in JSON-like form) for current file being viewed: ",
                        nextMeta,
                    );

                    unstable_batchedUpdates(() => {
                        channelsStore.setState({ loader: nextLoader });
                        viewerStore.setState({ metadata: nextMeta });
                    });

                    dispatch({ type: "SET_TIFF_METADATA", payload: nextMeta });
                }
            } catch (error) {
                console.error("Error loading file:", error);
                dispatch({
                    type: "SET_ERROR",
                    payload: {
                        message: "Error loading TIFF file.",
                        traceback: error.message,
                    },
                });
            } finally {
                viewerStore.setState({ isChannelLoading: [false] });
                viewerStore.setState({ isViewerLoading: false });
            }
        },
        [viewerStore, channelsStore],
    );

    const handleDatasourceNameChange = (event) => {
        const { value } = event.target;
        setDatasourceName(value); // Update the state with the new value
        setCsvSummary((prevCsvSummary) => ({
            ...prevCsvSummary,
            datasourceName: value, // Update datasourceName in the summary object
        }));
    };

    const { getRootProps, getInputProps, isDragActive, fileRejections } =
        useDropzone({
            onDrop,
            accept: {
                "text/csv": [".csv"],
                "image/tiff": [".tiff", ".tif"],
            },
        });
    const rejectionMessage =
        fileRejections.length > 0
            ? "Only CSV and TIFF files can be selected"
            : "Drag and drop files here or click the button below to upload";

    const rejectionMessageStyle =
        fileRejections.length > 0 ? "text-red-500" : "";

    const getTextWidth = (
        canvas: HTMLCanvasElement,
        context: CanvasRenderingContext2D,
        text: string,
    ) => {
        context.font = getComputedStyle(document.body).fontSize + " Arial";
        return context.measureText(text).width;
    };

    // Function to calculate the maximum total width needed for the ColumnPreview component
    const calculateTotalWidth = (
        columnNames: string[],
        columnTypes: string[],
        secondRowValues: string[],
    ) => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        let maxColumnNameWidth = 0;
        let maxColumnTypeWidth = 0;
        let maxColumnSecondRowWidth = 0;

        // Calculate the maximum width of column names
        maxColumnNameWidth = Math.max(
            ...columnNames.map((name) => getTextWidth(canvas, context, name)),
        );

        // Calculate the maximum width of column types
        maxColumnTypeWidth = Math.max(
            ...columnTypes.map((type) => getTextWidth(canvas, context, type)),
        );

        // Calculate the maximum width of second row values
        maxColumnSecondRowWidth = Math.max(
            ...secondRowValues.map((value) =>
                getTextWidth(canvas, context, value),
            ),
        );

        // Calculate the total width needed for the ColumnPreview component
        const totalWidth =
            maxColumnNameWidth +
            maxColumnTypeWidth +
            maxColumnSecondRowWidth +
            32; // Add padding
        canvas.remove();
        return Math.max(800, totalWidth);
    };

  const handleUploadClick = async () => {
    console.log("Uploading file...");
    if (!state.selectedFiles.length) {
        dispatch({
            type: "SET_ERROR",
            payload: {
                message: "No files selected. Please select a file before uploading.",
                status: 400,
            },
        });
        return;
    }

        const fileExtension = state.selectedFiles[0].name
            .split(".")
            .pop()
            ?.toLowerCase();
        dispatch({ type: "SET_IS_UPLOADING", payload: true });
        resetProgress();

        const config = {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (progressEvent) => {
                const percentComplete = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total,
                );
                setProgress(percentComplete);
            },
        };

        try {
            let response;
            if (fileExtension === "tiff") {
                const formData = new FormData();
                formData.append("file", state.selectedFiles[0]);
                formData.append("datasourceName", datasourceName);

                try {
                    formData.append("tiffMetadata", JSON.stringify(state.tiffMetadata));
                } catch (jsonError) {
                    console.error("Invalid JSON format for tiffMetadata:", jsonError);
                    dispatch({
                        type: "SET_ERROR",
                        payload: {
                            message: "Invalid JSON format in tiffMetadata. Please check the data.",
                            status: 400,
                            traceback: jsonError.message,
                        },
                    });
                    dispatch({ type: "SET_IS_UPLOADING", payload: false });
                    return;
                }

                response = await axios.post(
                    `${root}/add_or_update_image_datasource`,
                    formData,
                    config,
                );
            } else {
                const formData = new FormData();
                formData.append("file", state.selectedFiles[0]);
                formData.append("name", datasourceName);
                formData.append("replace", "");

                response = await axios.post(
                    `${root}/add_datasource`,
                    formData,
                    config,
                );
            }

            console.log("File uploaded successfully", response.data);
            if (response.status === 200) {
                dispatch({ type: "SET_IS_UPLOADING", payload: false });
                dispatch({ type: "SET_SUCCESS", payload: true });

                if (fileExtension === "tiff") {
                    chartManager.saveState();
                }
            } else {
                console.error(`Failed to confirm: Server responded with status ${response.status}`);
                dispatch({ type: "SET_IS_UPLOADING", payload: false });
                dispatch({
                    type: "SET_ERROR",
                    payload: {
                        message: `File upload completed, but confirmation failed with status: ${response.status}`,
                        status: response.status,
                        traceback: "Server responded with non-200 status",
                    },
                });
            }
        } catch (error) {
            console.error("Error uploading file:", error);
    
            // Specific handling for known Axios errors
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 400) {
                    dispatch({
                        type: "SET_ERROR",
                        payload: {
                            message: "Bad Request: The server could not process the uploaded file.",
                            status: 400,
                            traceback: error.message,
                        },
                    });
                } else if (error.response?.status === 500) {
                    dispatch({
                        type: "SET_ERROR",
                        payload: {
                            message: "Server Error: An error occurred while processing the upload.",
                            status: 500,
                            traceback: error.message,
                        },
                    });
                } else {
                    dispatch({
                        type: "SET_ERROR",
                        payload: {
                            message: `Upload failed with status: ${error.response?.status || "unknown"}`,
                            status: error.response?.status || 500,
                            traceback: error.message,
                        },
                    });
                }
            } else {
                dispatch({
                    type: "SET_ERROR",
                    payload: {
                        message: "Upload failed due to a network error or unknown issue.",
                        status: 500,
                        traceback: error.message,
                    },
                });
            }
    
            // Clean up and reset state
            dispatch({ type: "SET_IS_UPLOADING", payload: false });
            console.log("Attempting to clean up partially uploaded files...");
        }
    };

    const handleClose = async () => {
        dispatch({ type: "SET_FILE_SUMMARY", payload: null });
        onResize(450, 320);
        onClose();
    };

    return (
        <Container>
            {state.isUploading ? (
                <StatusContainer>
                    <Message>
                        {"Your file is being uploaded, please wait..."}
                    </Message>
                    <ProgressBar value={progress} max="100" />
                </StatusContainer>
            ) : state.isInserting ? (
                <StatusContainer>
                    <Message>
                        {"Your file is being processed, please wait..."}
                    </Message>
                    <Spinner />
                </StatusContainer>
            ) : state.success ? (
                <>
                    <SuccessContainer>
                        <SuccessHeading>Success!</SuccessHeading>
                        <SuccessText>
                            The file was uploaded successfully to the database.
                        </SuccessText>
                    </SuccessContainer>
                    <Button
                        color="green"
                        onClick={() => window.location.reload()}
                    >
                        Refresh Page
                    </Button>
                </>
            ) : state.error ? (
                <>
                    <ErrorContainer>
                        <ErrorHeading>
                            An error occurred while uploading the file:
                        </ErrorHeading>
                        <p>{state.error.message}</p>
                        {state.error.traceback && (
                            <pre>{state.error.traceback}</pre>
                        )}
                    </ErrorContainer>
                </>
            ) : state.isValidating ? (
                <StatusContainer>
                    <Message>{"Validating data, please wait..."}</Message>
                    <Spinner />
                </StatusContainer>
            ) : state.validationResult ? (
                <>
                    {state.fileType === "csv" && (
                        <>
                            <FileSummary>
                                <FileSummaryHeading>
                                    {"Uploaded File Summary"}
                                </FileSummaryHeading>
                                <FileSummaryText>
                                    <DatasourceNameInput
                                        value={datasourceName}
                                        onChange={handleDatasourceNameChange}
                                        isDisabled={
                                            state.selectedFiles.length === 0
                                        }
                                    />
                                </FileSummaryText>
                                <FileSummaryText>
                                    <strong>{"File name"}</strong>{" "}
                                    {csvSummary.fileName}
                                </FileSummaryText>
                                <FileSummaryText>
                                    <strong>{"Number of rows"}</strong>{" "}
                                    {csvSummary.rowCount}
                                </FileSummaryText>
                                <FileSummaryText>
                                    <strong>{"Number of columns"}</strong>{" "}
                                    {csvSummary.columnCount}
                                </FileSummaryText>
                                <FileSummaryText>
                                    <strong>{"File size"}</strong>{" "}
                                    {csvSummary.fileSize} MB
                                </FileSummaryText>
                            </FileSummary>
                            <ColumnPreview
                                columnNames={columnNames}
                                columnTypes={columnTypes}
                                secondRowValues={secondRowValues}
                            />

                            <div className="flex justify-center items-center gap-6 mt-4">
                                <Button
                                    marginTop="mt-1"
                                    onClick={handleUploadClick}
                                >
                                    {"Upload"}
                                </Button>
                                <Button
                                    color="red"
                                    size="px-6 py-2.5"
                                    marginTop="mt-1"
                                    onClick={handleClose}
                                >
                                    {"Cancel"}
                                </Button>
                            </div>
                        </>
                    )}

                    {state.fileType === "tiff" && state.tiffMetadata && (
                        <>
                            <div className="h-full w-full flex">
                                <div className="w-1/3 flex flex-col">
                                    <div className="flex items-center justify-center">
                                        <div className="flex items-start justify-start pt-5 pl-4">
                                            <FileSummary>
                                                <FileSummaryHeading>
                                                    {"Uploaded File Summary"}
                                                </FileSummaryHeading>
                                                <FileSummaryText>
                                                    <strong>
                                                        {"File name:"}
                                                    </strong>{" "}
                                                    {tiffSummary.fileName}
                                                </FileSummaryText>
                                                <FileSummaryText>
                                                    <strong>
                                                        {"File size:"}
                                                    </strong>{" "}
                                                    {tiffSummary.fileSize} MB
                                                </FileSummaryText>
                                                <DatasourceDropdown
                                                    options={updatedNamesArray}
                                                    onSelect={handleSelect}
                                                />
                                            </FileSummary>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center">
                                        <div className="flex flex-col items-center justify-center ">
                                            <FileSummaryText>
                                                <strong>Image Preview:</strong>
                                            </FileSummaryText>
                                            <TiffVisualization
                                                metadata={state.tiffMetadata}
                                                file={state.selectedFiles[0]}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="w-2/3">
                                    <div className="flex items-start justify-start h-[70%] min-h-[420px]">
                                        {showMetadata ? (
                                            <TiffMetadataTable
                                                metadata={state.tiffMetadata}
                                            />
                                        ) : (
                                            <TiffPreview
                                                metadata={state.tiffMetadata}
                                            />
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center ml-4 mr-2 mt-12">
                                        <Button
                                            color="gray"
                                            size="px-6 py-2.5"
                                            marginTop="mt-1"
                                            onClick={toggleView}
                                        >
                                            {showMetadata
                                                ? "View Metadata as XML"
                                                : "View Metadata as Table"}
                                        </Button>
                                        <div className="flex space-x-4 ml-auto">
                                            <Button
                                                marginTop="mt-6"
                                                onClick={handleUploadClick}
                                            >
                                                {"Upload"}
                                            </Button>
                                            <Button
                                                color="red"
                                                size="px-6 py-2.5"
                                                marginTop="mt-6"
                                                onClick={handleClose}
                                            >
                                                {"Cancel"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </>
            ) : (
                <>
                    <DropzoneContainer
                        {...getRootProps()}
                        isDragOver={isDragActive}
                        aria-label={"dropzoneLabel"}
                    >
                        <input {...getInputProps()} />
                        <div className="flex flex-col items-center justify-center space-y-0">
                            <CloudUploadIcon
                                className="text-gray-400"
                                style={{ fontSize: "5rem" }}
                            />
                            {isDragActive ? (
                                <DynamicText
                                    text={"Drop files here..."}
                                    className="text-sm"
                                />
                            ) : (
                                <DynamicText
                                    text={
                                        state.selectedFiles.length > 0
                                            ? `Selected file: ${state.selectedFiles[0].name}`
                                            : rejectionMessage
                                    }
                                    className={`${rejectionMessageStyle} text-sm`}
                                />
                            )}
                            <FileInputLabel
                                htmlFor="fileInput"
                                className="text-sm"
                            >
                                {"Choose File"}
                            </FileInputLabel>
                        </div>
                    </DropzoneContainer>
                </>
            )}
        </Container>
    );
};

export default observer(FileUploadDialogComponent);
