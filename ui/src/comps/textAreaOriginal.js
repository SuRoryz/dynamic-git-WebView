import { Uploader, Input, Panel, Button, FlexboxGrid } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import { useRef, useState, useEffect } from 'react';
import FolderFillIcon from '@rsuite/icons/FolderFill';
import { Icon } from '@rsuite/icons';
import CodeMirror from "@uiw/react-codemirror";
import { saveFile, originalFile } from "../utils/utils";
import Editor from "@monaco-editor/react";
import useSettings from '../Settings/useSettings';

export function TextAreaOriginalWrapper({currentFileDataWritable, originalFileData, originalFileDataCopy, path}) {
    return (
        <div className='fileViewEditable'>
            {currentFileDataWritable ? <TextAreaOriginal originalFileData={originalFileData} originalFileDataCopy={originalFileDataCopy} path={path}/> : null}
        </div>
    )
}

export function TextAreaOriginal({originalFileData, originalFileDataCopy, path}) {
    const { settings, saveSettings } = useSettings();
    
    let fileData = []

    typeof(originalFileDataCopy[0]) == "object" && originalFileDataCopy.length > 0 ? originalFileDataCopy.forEach((p) => {
        if (!p) return

        fileData.push(
            <div style={{display: "flex"}}>
              {settings.type == "SPLIT" ? 
                <span className='lineIdx'>@@</span> :
                <>
                    <span className='lineIdx'>@@</span>
                    <span className='lineIdx'>@@</span>
                </>
              }
              <span className='lineValue'>--------------------------</span>
            </div>,
            p.map((el) => {
            return <div style={{overflow: "auto"}} className={'fileView ' + (settings.theme == "dark" ? " dark" : "")}>
                        <div style={{display: "flex"}} className={el.type == "+" ? "added" : el.type == "-" ? "removed" : ""}>
                            <span className='lineIdx'>{el.index}</span>
                            <span className='lineValue'>{el.value}</span>
                        </div>
                    </div>
        }))
    }) : fileData.push()

    return (
        <>
        {settings.type == "UNIDKJKSD" ?
            <div style={{whiteSpace: "pre-wrap"}}>{originalFileData}</div>
        :
            <div style={{width: "100%", height: "100%", overflow: "auto", borderRadius: "0 0 0 0"}}>
                {fileData}
                {}
            </div>}
        </>
    )
}

