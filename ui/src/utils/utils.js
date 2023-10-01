import { socket } from '../socket_context/sockets';

export var originalFile = [];

export function saveFile(data, currentFile) {
    fetch('http://localhost:5000/savefile',
        {headers: {
            'Content-Type': 
                'application/json;charset=utf-8'
        },
        body: JSON.stringify({path: currentFile,
                              data: data.replaceAll("\r", "")}),
        method: 'POST'}
    );
  }

export function setRepo(selectedPath) {
    socket.emit('setrepo', {path: selectedPath.join("\\")});
  }

export function selectFile() {
    socket.emit('oswalk', {});
  }

export function oswalk(folder) {
    socket.emit('oswalk', {"path": folder});
  }

export function getDiffs(filename, type) {
    socket.emit("getdiffs", {filename, type})
  }

export function openFilePair(t, openFileProps) {
  const {setCurrentFile,
    setOriginalFile,
    setCurrentFileData,
    setCurrentFileDataWrtitable,
    setUpdateDiffs,
    setWriting} = openFileProps;

fetch('http://localhost:5000/getfile',
        {headers: {
            'Content-Type': 
                'application/json;charset=utf-8'
        },
        body: JSON.stringify({t: t, sid: socket.sid}),
        method: 'POST'}
    ).then(response => response.text())
    .then(data => {

    })
}

export function openFile(filename, openFileProps, forcePage) {
    const {setCurrentFile,
        setOriginalFile,
        setCurrentFileData,
        setCurrentFileDataWrtitable,
        setUpdateDiffs,
        setWriting, page} = openFileProps;
    
    let p = page;
      
    if (forcePage) {
      p = forcePage
    } else {
      p = page
    }

    fetch('http://localhost:5000/getfile',
            {headers: {
                'Content-Type': 
                    'application/json;charset=utf-8'
            },
            body: JSON.stringify({path: filename, sid: socket.sid}),
            method: 'POST'}
        )
    .then(response => response.status == 200 ? response.text() : null)
    .then(data => {
        if (data == 'Нет изменений') {
          originalFile = [{index: "|", value: data, type: ""}]
          setCurrentFileData([[{index: "|", value: data, type: ""}]], "*")
          setCurrentFileDataWrtitable([[{index: "|", value: data, type: ""}]], "*");
          setOriginalFile([[{index: "|", value: data, type: ""}]], "*");
          return
        }

        setCurrentFile(filename);

        originalFile.splice(p - 1, 1, data.split("\n").map((el, idx) => {
          return {index: idx + 1, value: el, type: ""}
        }))
        console.log(originalFile)

        setOriginalFile(structuredClone(originalFile[p - 1]), p - 1);
        setCurrentFileData(structuredClone(originalFile[p - 1]), p - 1);
        setCurrentFileDataWrtitable(data.split("\n"), p - 1);
        setUpdateDiffs(true);
      })
      .catch(error => {

      });
  }

  export function getLastFile(openFileProps) {
    const {setCurrentFile,
      setOriginalFile,
      setCurrentFileData,
      setCurrentFileDataWrtitable,
      setUpdateDiffs,
      setWriting} = openFileProps;

    fetch('http://localhost:5000/getlastfile',
            {headers: {
                'Content-Type': 
                    'application/json;charset=utf-8'
            },
            body: JSON.stringify({sid: socket.sid}),
            method: 'POST'}
        )
    .then(response => response.text())
    .then(data => {
        setCurrentFile(data.filename);
    });
  }

  export function reOpenFile(openFileProps) {
    const {setCurrentFile,
        setOriginalFile,
        setCurrentFileData,
        setCurrentFileDataWrtitable,
        setUpdateDiffs,
        setWriting, page} = openFileProps;
    
      let p = page;


    fetch('http://localhost:5000/regetfile',
            {headers: {
                'Content-Type': 
                    'application/json;charset=utf-8'
            },
            body: JSON.stringify({sid: socket.sid}),
            method: 'POST'}
        )
    .then(response => response.status == 200 ? response.text() : null)
    .then(data => {
      if (data == 'Нет изменений') {
        originalFile = [{index: "|", value: data, type: ""}]
        setCurrentFileData([[{index: "|", value: data, type: ""}]], "*")
        setCurrentFileDataWrtitable([[{index: "|", value: data, type: ""}]], "*");
        setOriginalFile([[{index: "|", value: data, type: ""}]], "*");
        return
      }

      originalFile.splice(p - 1, 1, data.split("\n").map((el, idx) => {
        return {index: idx + 1, value: el, type: ""}
      }))

      setOriginalFile(structuredClone(originalFile[p - 1]), p - 1);
      setCurrentFileData(structuredClone(originalFile[p - 1]), p - 1);
      setCurrentFileDataWrtitable(data.split("\n"), p - 1);
      setUpdateDiffs(true);
      })
      .catch(error => {
        //console.error(error);
      });
  }