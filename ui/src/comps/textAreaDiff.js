import { Uploader, Input, Panel, Button, FlexboxGrid } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import { useState, useEffect } from 'react';
import useSettings from '../Settings/useSettings';
import { InView } from 'react-intersection-observer';
import { socket } from '../socket_context/sockets';

function ObserveComponent ({viewtimeout, setViewTimeout}) {
  return (
    <InView as="div" onChange={(inView, entry) => {if (inView) {
      console.log(inView)
      clearTimeout(viewtimeout);
      setViewTimeout(setTimeout(() => { socket.emit('nextpage') }, 500)) }}
    }>
      <h2 style={{visibility: 'hidden', position: 'absolute', bottom: 0, height: "5rem"}}>Plain children are always rendered. Use onChange to monitor state.</h2>
    </InView>
  )}

export default function TextAreaDiff({currentFileData}) {
    const { settings, saveSettings } = useSettings();
    const [ width, setWidth ] = useState(50);
    const [ dragging, setDragging ] = useState(false)
    const [ viewtimeout, setViewTimeout ] = useState(0)

    let fileData = [];

    useEffect(() =>  {
      fileData = [];
    }, [currentFileData])

    currentFileData && currentFileData.length > 0 ? (currentFileData.forEach((p) => {
      if (!p) return

      fileData.push(
        <div style={{display: "flex"}}>
          {settings.type == "SPLIT" ? 
            <span className='lineIdx'>@@</span> :
            <><span className='lineIdx'>@@</span>
            <span className='lineIdx'>@@</span></>
          }
          <span className='lineValue'>{"-".repeat(5) + p[0].name + "-".repeat(5)}</span>
        </div>,
        p.map((el, idx) => {
        return <div style={{display: "flex"}} className={el.type == "+" ? "added" : el.type == "-" ? "removed" : ""}>
          {settings.type == "SPLIT" ? 
            <span className='lineIdx'>{el.index}</span> :
            <><span className='lineIdx'>{["-", ""].includes(el.type) ? el.index : "+"}</span>
            <span className='lineIdx'>{["+", ""].includes(el.type) ? el.index : "-"}</span></>
          }
          <span className='lineValue'>{el.value}</span>
        </div>}))
    })) : fileData.push()

    return (
        <div className={'fileView ' + (settings.theme == "dark" ? " dark" : "")} style={{position: 'relative'}}>
          {fileData}
          {fileData.length > 1 ? <ObserveComponent viewtimeout={viewtimeout} setViewTimeout={setViewTimeout} /> : null}
        </div>
    )
}