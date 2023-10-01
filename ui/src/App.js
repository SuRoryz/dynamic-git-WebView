import './App.css';
import { Panel, CustomProvider, FlexboxGrid, Container, Content, Header } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import { useRef, useState, useEffect, useCallback, useContext } from 'react';
import { socket } from './socket_context/sockets';

import { getDiffs, originalFile, openFile } from "./utils/utils";

import TextAreaDiff from "./comps/textAreaDiff";
import { TextAreaOriginalWrapper} from "./comps/textAreaOriginal";
import ToolBar from "./comps/toolBar";
import useSettings from './Settings/useSettings';

function App() {
  const [selectedPath, setSelectedPath] = useState('');
  const [currDirFiles, setCurrDirFiles] = useState([]);
  const [currDirDirs, setCurrDirDirs] = useState([]);
  const [currentFile, setCurrentFile] = useState('');
  const [currentFileData, setCurrentFileDataX] = useState([]);
  const [currentFileDataWritable, setCurrentFileDataWrtitable] = useState([]);

  const [isCurrFolderRepo, setIsCurrFolderRepo] = useState(false);
  const [updateDiffs, setUpdateDiffs] = useState(false);
  const [writing, setWriting] = useState(false);

  const [originalFileData, setOriginalFileF] = useState([]);
  const [ originalFileDataCopy, setOriginalFileCopyX ] = useState([]);

  const [ dragging, setDragging ] = useState(false);
  const [ width, setWidth ] = useState({left: "30%", right: "70%"});
  const [ lastPos, setLastPos ] = useState(0);

  const [ page, setPage ] = useState(1)
  const [ updatePage, setUpdatePage ] = useState(false)

  const [, updateState] = useState();
  const forceUpdate = useCallback(() => updateState({}), []);

  const panel = useRef();
  const originalPanel = useRef();

  const { settings, saveSettings } = useSettings();

  const openFileProps = {
    setCurrentFile,
    setOriginalFile: setOriginalFileX,
    setCurrentFileData,
    setCurrentFileDataWrtitable,
    setUpdateDiffs,
    setWriting,
    page
  }

  function setCurrentFileData (n, p) {
    if (p == "*") {
      setCurrentFileDataX([]);
      return
    }

    let cf = currentFileData.copyWithin()
    cf.splice(p, 1, n)

    setCurrentFileDataX(currentFileData);
  }

  function setOriginalFile (n, p) {
    if (p == "*") {
      setOriginalFileF([]);
      return
    }
    originalFileData.splice(p, 1, n)
    
    setOriginalFileF(originalFileData);
  }

  function setOriginalFileCopy (n, p) {
    if (p == "*") {
      setOriginalFileCopyX([]);
      return
    }

    originalFileDataCopy.splice(p, 1, n)

    setOriginalFileCopyX(originalFileDataCopy);
  }

  function setOriginalFileX (n, p) {
    setOriginalFileCopy(n, p);
    setOriginalFile(n, p);
  }

  useEffect(() => {

  }, [currentFileData])
  
  useEffect(() => {
    socket.off('nextpage');

    socket.on("nextpage", (data) => {
      if (data.stop) { return }
      if (data.next) {
        setPage(data.next + 1)
        openFile(null, openFileProps, data.next + 1)
      }
    })
  }, [page])

  useEffect(() => {
    socket.on("s", (data) => {
      socket.sid = data.sid
      socket.emit('initCache', {sid: socket.sid})
    })

    socket.on('settype', () => {
      setCurrentFileData([], "*");
      setOriginalFile([], "*");
      setOriginalFileCopy([], "*");
      setPage(0);
      originalFile.splice(0, originalFile.length)
      openFile(null, openFileProps, 0)
    })

    socket.on('oswalk', (data) => {
      setSelectedPath(data.path.split("\\"));
      setCurrDirFiles(data.files);
      setCurrDirDirs(data.dirs);
    });

    socket.on('setdiffpair', () => {
      setCurrentFileData([], "*");
      setOriginalFile([], "*");
      setOriginalFileCopy([], "*");
      setPage(0);
      originalFile.splice(0, originalFile.length)
      openFile(null, openFileProps, 0)
    })

    socket.on("getdiffs", (data) => {
      if (!data || !data.data || data.data.length == 0) { return }

      let tp = settings.type;

      if (data.data[0].type != settings.type) { 
        saveSettings({...settings, type: data.data[0].type})
        tp = data.data[0].type;
      }

      let cc = originalFile[data.page].copyWithin()

      if (tp == "UNI") {
        let offset = 0;

        data.data.forEach((e) => {
          if (!e) { return }

          cc.splice(e.Tstart - 1 + offset, e.Tlen, ...e.hunk);

          offset += e.hunk.length - e.Tlen
        });

        setCurrentFileData(cc, data.page);
      } else {
        let oc = structuredClone(originalFile[data.page])

        let ccOfsset = 0;
        let ocOffset = 0;

        data.data.forEach((e) => {
          cc.splice(e.Tstart - 1, e.Tlen, ...e.target.map((el, index) => {
            return {index: e.Tstart + index, value:  el.slice(1), type: el[0]}
          }));
          oc.splice(e.Sstart - 1, e.Tlen, ...e.source.map((el, index) => {
            return {index: e.Sstart + index + ocOffset, value: el.slice(1), type: el[0]}
          }))

          ccOfsset += e.Tlen - e.Slen;
          ocOffset += e.Tlen - e.Slen;
        });

        setCurrentFileData(cc.copyWithin(), data.page);
        setOriginalFileCopy(oc.copyWithin(), data.page);
      }
      
      let element = panel.current
      let hasOverflowingChildren = element.offsetHeight < element.scrollHeight || element.offsetWidth < element.scrollWidth;

      if (!hasOverflowingChildren) {
        socket.emit("nextpage")
      }

      forceUpdate()
      });
  }, [])

  useEffect(() => {
    if (!writing) {
      setCurrentFileData([], "*");
    }
  }, [writing])

  useEffect(() => {
    currDirDirs.forEach((el) => {
      if (el == ".git") {
        setIsCurrFolderRepo(true);
      }
    })
  }, [currDirDirs])

  useEffect(() => {
  }, [currentFileData, page])

  useEffect(() => {
    if (updateDiffs) {
      if (isCurrFolderRepo) {
        let fn;
        if (currentFile) {
          fn = currentFile.split("\\")[currentFile.split("\\").length - 1];
        }
        getDiffs(fn, settings.type);
      }
      setUpdateDiffs(false);
    }
  }, [updateDiffs])

  return (
    <Container style={{height: "100%", width: "100%", display: "flex", flexDirection: "column", userSelect: dragging ? "none" : "auto"}} className={settings.theme}>
      <Header style={{height: "4rem", width: "100%"}}>
        <ToolBar
          selectedPath={selectedPath} 
          setSelectedPath={setSelectedPath}
          currDirFiles={currDirFiles}
          currDirDirs={currDirDirs}
          isCurrFolderRepo={isCurrFolderRepo}
          writing={writing}
          setWriting={setWriting}
          openFileProps={openFileProps}/>
      </Header>
      <Content style={{height: "calc(100% - 4rem)", width: "100%"}}
      onMouseMove={(e) => {
        if (dragging) {
          setWidth({
            left: `calc(30% - ${lastPos - e.nativeEvent.pageX}px)`,
            right: `calc(70% + ${lastPos - e.nativeEvent.pageX}px)`
          })
        }
      }}
      onClick={() => {
        if ( dragging ) {
          setDragging(false);
        }
      }}
      >
        <FlexboxGrid style={{height: "100%", width: "100%"}} justify='space-between'>
            <Panel className='initHalfWidth' ref={originalPanel} style={{width: width.left, height: "100%"}} bodyFill>
              {!writing ?
                null
              : 
                <TextAreaOriginalWrapper
                  currentFileDataWritable={currentFileDataWritable}
                  originalFileDataCopy={originalFileDataCopy}
                  originalFileData={originalFileData}
                  path={currentFile} />
              }
              
            </Panel>
            <Panel className='initHalfWidth borderedLeft' bodyFill ref={panel} style={{width: width.right, height: "100%", overflow: "auto", borderRadius: "0 0 0 0"}}
              onMouseDown={(e) => {
                if (Math.abs(e.nativeEvent.offsetX) < 20) {
                  if (!lastPos) {
                    setLastPos(e.nativeEvent.pageX);
                  }

                  e.target.style.cursor = "ew-resize";
                  setDragging(true);
                }
              }}

              onMouseMove={(e) => {
                if (Math.abs(e.nativeEvent.offsetX) < 20) {
                  e.target.style.cursor = "ew-resize";
                } else {
                  e.target.style.cursor = "auto";
                }
              }}

              onMouseUp={(e) => {
                e.target.style.cursor = "auto";
                setDragging(false);
              }}
              >
                <TextAreaDiff currentFileData={currentFileData}/>
              </Panel>
        </FlexboxGrid>
      </Content>
    </Container>
  );
}

function ThemedApp() {
  const { settings, saveSettings } = useSettings();

  return (
    <CustomProvider theme={settings.theme}>
      <App />
    </CustomProvider>
  )
}

export default ThemedApp;
