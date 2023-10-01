import { Radio, RadioGroup, Input, Modal, Button, Breadcrumb, Navbar, Nav, ButtonGroup, Toggle, Drawer, SelectPicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import { useRef, useState, useEffect } from 'react';
import FolderFillIcon from '@rsuite/icons/FolderFill';
import { Icon } from '@rsuite/icons';
import CodeMirror from "@uiw/react-codemirror";
import { saveFile, oswalk, selectFile, setRepo, openFile } from "../utils/utils";
import { socket } from "../socket_context/sockets";
import useSettings from '../Settings/useSettings';
import CheckIcon from '@rsuite/icons/Check';
import PageTopIcon from '@rsuite/icons/PageTop';
import Logo from '../benz.png';
import DirectoryList from "./directoryList";

function PathBack({selectedPath, setSelectedPath, writing, setWriting}) {
    return (
        <Icon as={PageTopIcon} className='pathBack' onClick={() => {
            if (writing) {
                setWriting(false);
                return
            }

            selectedPath.pop();
            setSelectedPath(selectedPath);

            oswalk(selectedPath.join("\\") + "\\")
        }}/>
    )
}

function PathTree({selectedPath, writing, setWriting}) {
    return (
        <Breadcrumb>
            {selectedPath.map((el, idx) => {
                return (
                    <Breadcrumb.Item onClick={() => {
                        if (writing) {
                            setWriting(false);
                        }

                        oswalk(selectedPath.slice(0, idx + 1).join("\\") + "\\");
                    }}>
                        {el}
                    </Breadcrumb.Item>
                )
            })}
        </Breadcrumb>
    )
}

export default function ToolBar({selectedPath, setSelectedPath, currDirFiles, currDirDirs, isCurrFolderRepo, writing, setWriting, openFileProps}) {
    const { settings, saveSettings } = useSettings();

    const [ mode, setModeF ] = useState("LOCAL")
    const [ commitsOrbraches, setCommitsOrBranches ] = useState("сommits")

    const [ pairValues, setPairValuesF ] = useState({toDiff: "LOCAL", withDiff: "LOCAL"})
    const [ commits, setCommits ] = useState([])

    const [ openModal, setOpenModal ] = useState(false);
    const [ drawerOpen, setDrawerOpen ] = useState(false)

    const [ url, setUrl ] = useState('')
    const [ urlStatus, setUrlStatus ] = useState(false)

    function setMode (n) {
        setModeF(n);
        socket.emit("setmode", {mode: n})
    }

    function setPairValues (n, t) {
        setPairValuesF(n);
        socket.emit("setdiffpair", {pair: n, t})
    }

    useEffect(() => {
        socket.on('url', (data) => {
            if (data.status == "start") {
                setUrlStatus("Загрузка...")
            } else {
                setOpenModal(false)
            }
        })
    }, [])

    useEffect(() => {
    }, [pairValues])

    useEffect(() => {
        socket.on('getcommits', (data) => {
            setCommits(data.items.map((el) => {
                return {label: `${el.name} #${el.sha}`, value: el.sha}
            }))
        })

        socket.on('getfileneeded', () => {
            openFile(null, openFileProps)
        })
    }, [])
    
    const renderMenu = menu => {
        if (commits.length === 0) {
            return (
            <p style={{ padding: 4, color: '#999', textAlign: 'center' }}>
                Loading...
            </p>
            );
        }
        return menu;
    };
      
    return (
        <>
         <Modal backdrop={'true'} keyboard={true} open={openModal} onClose={() => setOpenModal(false)} style={{marginTop: '4rem'}}>
            <Modal.Header>
            <Modal.Title>Ссылка на репозиторий</Modal.Title>
            </Modal.Header>

            <Modal.Body>
            <Input value={url} onChange={setUrl} placeholder='https://github.com/name/repo'></Input>
            </Modal.Body>
            <Modal.Footer>
            <Button appearance="primary" onClick={() => {
                socket.emit('url', {url})
                setOpenModal(false);
                setDrawerOpen(true);
                oswalk("./repos/");
            }}>
                Ок
            </Button>
            <Button onClick={() => setOpenModal(false)} appearance="subtle">
                Отмена
            </Button>
            </Modal.Footer>
        </Modal>
        <Drawer backdrop={'true'} open={drawerOpen} placement={'left'} onClose={() => setDrawerOpen(false)}>
        <Drawer.Header>
          <Drawer.Title>Drawer Title</Drawer.Title>
          <Drawer.Actions>

          </Drawer.Actions>
        </Drawer.Header>
        <Drawer.Body>
        <div style={{height: "100%", width: "100%", display: "flex", flexDirection: "column"}}>
        <div style={{display: "flex", flexDirection: "column", height: "23%", width: "100%", justifyContent: "space-between"}}>
        { isCurrFolderRepo ? <>
        <div>
                    <RadioGroup name="radioList" inline appearance="picker" defaultValue="COMMITS" onChange={(e) => {
                        setRepo(selectedPath);
                        setMode(mode == "LOCAL" ? "COMMITS" : "LOCAL");
                        if (mode == "LOCAL") {
                            socket.emit("getcommits")
                        }
                        }
                    }>
                        <Radio value="LOCAL" checked={mode == "LOCAL"}>Сравнение</Radio>
                        <Radio value="COMMITS" checked={mode == "COMMITS"}>Один файл</Radio>
                    </RadioGroup>
        </div>
        { mode == "COMMITS" ? <>
                    <label>Коммит 1</label>
                    <SelectPicker
                        value={pairValues.toDiff}
                        style={{width: "100%"}}
                        renderMenu={renderMenu}
                        data={[{label: "Главный", value: "LOCAL"}, ...commits]}
                        onChange={(e) => {setPairValues({...pairValues, toDiff: e}, "toDiff")}}
                    />
                    
                    <label>Коммит 2</label>
                    <SelectPicker
                        value={pairValues.withDiff}
                        style={{width: "100%"}}
                        renderMenu={renderMenu}
                        data={[{label: "Главный", value: "LOCAL"}, ...commits]}
                        onChange={(e) => {setPairValues({...pairValues, withDiff: e}, "withDiff")}}
                    /> </> : null } </> : null}
        </div>
        <div className='filesView' style={{height: "100%", marginTop: "1rem"}}>
                  <DirectoryList
                    selectedPath={selectedPath}
                    currDirDirs={currDirDirs}
                    currDirFiles={currDirFiles}
                    openFileProps={openFileProps}
                    isCurrFolderRepo={isCurrFolderRepo}
                    writing={writing}/>
            </div>
        </div>
        
        </Drawer.Body>
      </Drawer>
        <Navbar className='toolBar'>
            <div className='toolBarBar'>
                <Nav>
                    <div className='navWrapper'>
                        <Navbar.Brand onClick={() => {setDrawerOpen(!drawerOpen)}}><img style={{width: "100%", height: "140%"}} src={Logo}></img></Navbar.Brand>
                        <Nav.Menu title="Файл">
                            <Nav.Item onClick={() => {
                                setWriting(false);
                                selectFile();
                                setDrawerOpen(true);
                            }}>Открыть локальный репозиторий</Nav.Item>
                            <Nav.Item onClick={() => setOpenModal(true)}>Открыть по ссылке</Nav.Item>
                        </Nav.Menu>
                        <Nav.Menu title="Тема">
                            <Nav.Item onClick={() => {
                                saveSettings({...settings, theme: "dark"});
                            }}>{settings.theme == "dark" ?  <Icon as={CheckIcon} /> : null} Темная
                            </Nav.Item>
                            <Nav.Item onClick={() => {
                                saveSettings({...settings, theme: "light"});
                            }}>{settings.theme == "light" ?  <Icon as={CheckIcon} /> : null} Светлая
                            </Nav.Item>
                        </Nav.Menu>
                        {isCurrFolderRepo ? <Nav.Item onClick={() => setRepo(selectedPath)}>Указать репозиторием</Nav.Item> : null}
                    </div>
                </Nav>
                <Nav pullRight>
                    
                    
                    <ButtonGroup className='diffStyleBtns'>
                        <Button appearance={settings.type == "SPLIT" ? "primary" : "ghost"} onClick={() => {
                            if (settings.type == "SPLIT") {
                                return
                            }
                            saveSettings({...settings, type: "SPLIT"});
                            socket.emit("settype", {
                                type: "SPLIT"
                            });
                            setWriting(true)

                        }}>Раздельно</Button>
                        <Button appearance={settings.type == "UNI" ? "primary" : "ghost"} onClick={() => {
                            if (settings.type == "UNI") {
                                return
                            }
                            saveSettings({...settings, type: "UNI"});
                            socket.emit("settype", {
                                type: "UNI"
                            });
                            setWriting(false)
                        }}>Слитно</Button>
                    </ButtonGroup>
                </Nav>
            </div>


              <PathToolBar
                selectedPath={selectedPath}
                setSelectedPath={setSelectedPath}
                writing={writing}
                setWriting={setWriting}
                empty={currDirFiles.length == 0 && currDirDirs.length == 0}/>
        </Navbar>
        </>

    )
}

function PathToolBar({selectedPath, setSelectedPath, writing, setWriting, empty}) {
    return (
            <div className='pathToolbar'>
                {!empty ?
                    <>
                    <PathBack selectedPath={selectedPath} setSelectedPath={setSelectedPath} writing={writing} setWriting={setWriting}/>
                    <PathTree selectedPath={selectedPath} setSelectedPath={setSelectedPath} writing={writing} setWriting={setWriting}/>
                    </> : null
                }
            </div>
    )
}