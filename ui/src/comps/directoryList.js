import { Notification, Button, useToaster, toaster } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import {  useState, useEffect } from 'react';
import FolderFillIcon from '@rsuite/icons/FolderFill';
import PageIcon from '@rsuite/icons/Page';
import { Icon } from '@rsuite/icons';
import { oswalk, openFile, setRepo, selectFile } from "../utils/utils";
import { socket } from '../socket_context/sockets';

function Listed({file, isFolder, selectedPath, openFileProps}) {
    return (
        <div onClick={() => {
            if (isFolder) {
                oswalk(selectedPath.join("\\") + "\\" + file)
            } else {
                openFile(selectedPath.join("\\") + "\\" + file, openFileProps)
            }
        }} className='listed'>
            {isFolder ? <Icon as={FolderFillIcon} fill='#d3d360'/> : <Icon as={PageIcon} fill='white'/>}
            <div>
                {file}
            </div>
        </div>
    )
}

function DirsList({selectedPath, currDirDirs}) {
    return (
        currDirDirs.map((file) => {
            if (file[0] == ".") { return }

            return (
                <Listed file={file} isFolder={true} selectedPath={selectedPath} />
            )
        })        
    )
}

function FilesList({selectedPath, currDirFiles, openFileProps}) {
    return (
        currDirFiles.map((file) => {
            if (file[0] == ".") { return }

            return (
                <Listed file={file} isFolder={false} selectedPath={selectedPath} openFileProps={openFileProps}/>
            )
          })      
    )
}

function ThisIsRepoAlert({selectedPath, toaster, setIsNotify}) {
    return (
        <Notification className='thisIsRepoAlert' closable onClose={() => setIsNotify(false)}>
            <span>Эта директория является репозиторием.</span>
            <hr></hr>
            <Button onClick={() => { setRepo(selectedPath); toaster.clear() }}>Выбрать его?</Button>
        </Notification>
    )
}

export default function DirectoryList({selectedPath, currDirDirs, currDirFiles, openFileProps, isCurrFolderRepo, writing}) {
    const toaster = useToaster();
    const [ isNotify, setIsNotify ] = useState(false)

    useEffect(() => {
        if (isCurrFolderRepo && !isNotify) {
            toaster.push(<ThisIsRepoAlert selectedPath={selectedPath} toaster={toaster} setIsNotify={setIsNotify}/>, { placement: 'bottomEnd', duration: 5 })
            setIsNotify(true)
        }
    }, [selectedPath, isCurrFolderRepo])

    return (
        currDirDirs.length > 0 || currDirFiles.length > 0 ?
                (<div className='directoryList'>
                    {currDirDirs.length > 0 ? 
                        <DirsList
                            selectedPath={selectedPath}
                            currDirDirs={currDirDirs}
                            openFileProps={openFileProps}/>
                        : null}
                    {currDirFiles.length > 0 ?
                        <FilesList 
                            selectedPath={selectedPath}
                            currDirFiles={currDirFiles}
                            openFileProps={openFileProps}/>
                        : null}
                </div>) : <div style={{display: 'flex', justifyContent: 'center'}}>
                            <Button onClick={selectFile}>Открыть локальный репозиторий</Button>
                        </div>
    )
}

