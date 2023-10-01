import git
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from unidiff import PatchSet
import os
from flask import Flask, render_template, jsonify, request, send_file
from flask_cors import CORS, cross_origin
from flask_socketio import SocketIO, emit
import io

app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'
socketio = SocketIO(app=app, cors_allowed_origins='*')

SESSIONS = {}

@socketio.on('connect')
def connect():
    emit('s', {'sid': request.sid})

@socketio.on('initCache')
def init(data):
    SESSIONS[data['sid']] = {
        'REPO': None,
        'MODE': "LOCAL",
        'CURRENT_FILENAME': None,
        'CURRENT_TYPE': "UNI",
        'CACHE': {},
        'COMMITS_PAIR': {"toDiff": "LOCAL", "withDiff": "LOCAL"},
        'PAGE': 0,
        "STOP": False
    }

@socketio.on('nextpage')
def nextpage():
    global SESSIONS

    pair = SESSIONS[request.sid]['COMMITS_PAIR']
    SESSIONS[request.sid]["PAGE"] += 1

    stop = SESSIONS[request.sid]["STOP"]

    emit('nextpage', {"next": SESSIONS[request.sid]["PAGE"], "stop": stop})

    if stop:
        SESSIONS[request.sid]["STOP"] = True

@socketio.on('setpage')
def setpage(data):
    global SESSIONS

    SESSIONS[request.sid]["PAGE"] = data["page"]

@socketio.on('oswalk')
def oswalk(data):
    path = "./repos/"
    
    if "path" in data:
        path = data['path']

    dirs = []
    files = []

    a = os.listdir(path)

    for file in a:
        if os.path.isdir(os.path.join(path, file)):
            dirs.append(file)
        else:
            files.append(file)
    
    emit('oswalk', {"path": os.path.abspath(path), "dirs": dirs, "files": files})

@socketio.on('getcommits')
def getcommits():
    global SESSIONS
    
    res = []

    for i in SESSIONS[request.sid]["REPO"].r.heads: 
        res.append({'sha': str(i), 'name': "Ветка"})

    for i in SESSIONS[request.sid]["REPO"].r.iter_commits():
        res.append({'sha': i.hexsha[:7], 'name': i.summary})
    
    emit('getcommits', {"items": res})

@socketio.on('setdiffpair')
def setdiffpair(data):
    global SESSIONS
    
    SESSIONS[request.sid]["COMMITS_PAIR"] = data["pair"]

    #emit("getfileneeded", {'t': data["t"]})
    emit("setdiffpair")
    SESSIONS[request.sid]["PAGE"] = 0
    #emit("nextpage", {"page": 0, "stop": True})

@socketio.on('setmode')
def setmode(data):
    global SESSIONS

    SESSIONS[request.sid]["MODE"] = data["mode"]

@socketio.on('setrepo')
def setrepo(data):
    global SESSIONS
    SESSIONS[request.sid]["REPO"] = Repository(data['path'], diffCallback=lambda x: emitDiffs(SESSIONS[request.sid]["REPO"], request.sid))

    emit("setrepo")

@socketio.on('settype')
def setrepo(data):
    global SESSIONS
    
    SESSIONS[request.sid]["CURRENT_TYPE"] = data["type"]
    SESSIONS[request.sid]["PAGE"] = 0
    emit("settype")
    
    #emitDiffs(SESSIONS[request.sid]["REPO"], request.sid)

def emitDiffs(REPO, sid):
    global SESSIONS

    if SESSIONS[sid]["CURRENT_TYPE"] == "UNI":
        if SESSIONS[sid]["MODE"] == "LOCAL":
            socketio.emit('getdiffs', {"data": SESSIONS[sid]["REPO"].getDiffForFileUni(
                SESSIONS[sid]["REPO"].getDiffbyFilename(SESSIONS[sid]["CURRENT_FILENAME"]))}, room=sid)
        else:
            socketio.emit('getdiffs', {"data": SESSIONS[sid]["REPO"].getDiffForCommitPairUni(
                SESSIONS[sid]["REPO"].getDiffbyFilename(SESSIONS[sid]["COMMITS_PAIR"]), SESSIONS[sid]["PAGE"]), "page": SESSIONS[sid]["PAGE"]}, room=sid)
    else:
        if SESSIONS[sid]["MODE"] == "LOCAL":
            socketio.emit('getdiffs', {"data": SESSIONS[request.sid]["REPO"].getDiffForFileSplit(
               SESSIONS[sid]["REPO"].getDiffbyFilename(SESSIONS[sid]["CURRENT_FILENAME"]))}, room=sid)
        else:
            socketio.emit('getdiffs', {"data": SESSIONS[request.sid]["REPO"].getDiffForCommitPairSplit(
               SESSIONS[sid]["REPO"].getDiffbyFilename(SESSIONS[sid]["COMMITS_PAIR"]), SESSIONS[sid]["PAGE"]), "page": SESSIONS[sid]["PAGE"]}, room=sid)

@socketio.on('url')
def downloadUrl(data):
    socketio.emit('url', {'status': 'start'}, room=request.sid)
    try:
        repo = git.Repo.clone_from(data['url'], f'./repos/{data["url"].split("/")[-1]}')
    except Exception as e:
        emit('url', {'status': 'fail', 'error': str(e)})
    else:
        emit('url', {'status': 'finish'})

@socketio.on('getdiffs')
def getdiffs(data):
    global SESSIONS

    if SESSIONS[request.sid]["MODE"] == "LOCAL":
        filename = data["filename"]
        chunk = []

        SESSIONS[request.sid]["CURRENT_TYPE"] = data["type"]

        try:
            if SESSIONS[request.sid]["CURRENT_TYPE"] == "UNI":
                chunk = SESSIONS[request.sid]["REPO"].getDiffForFileUni(SESSIONS[request.sid]["REPO"].getDiffbyFilename(filename))
            else:
                chunk = SESSIONS[request.sid]["REPO"].getDiffForFileSplit(SESSIONS[request.sid]["REPO"].getDiffbyFilename(filename))

        except Exception as e:
            print(e)
        SESSIONS[request.sid]["CURRENT_FILENAME"] = filename
    
    if SESSIONS[request.sid]["MODE"] == "COMMITS":
        try:
            if SESSIONS[request.sid]["CURRENT_TYPE"] == "UNI":
                chunk = SESSIONS[request.sid]["REPO"].getDiffForCommitPairUni(SESSIONS[request.sid]["COMMITS_PAIR"], page=SESSIONS[request.sid]["PAGE"])
            else:
                chunk = SESSIONS[request.sid]["REPO"].getDiffForCommitPairSplit(SESSIONS[request.sid]["COMMITS_PAIR"], page=SESSIONS[request.sid]["PAGE"])

        except Exception as e:
            print(e)

    emit('getdiffs', {"data": chunk, 'page': SESSIONS[request.sid]["PAGE"]})

@app.route("/getfile", methods=['POST'])
def getfile():
    global SESSIONS

    data = request.json
    sid = data['sid']
    repo = SESSIONS[sid]["REPO"]

    try:
    
        if SESSIONS[sid]["MODE"] == "LOCAL":
            path = data['path']

            SESSIONS[sid]["CACHE"]["path"] = path

            if not(SESSIONS[sid]["REPO"]) or SESSIONS[sid]["REPO"].name != path.split("\\")[:-1]:
                SESSIONS[sid]["REPO"] = Repository('\\'.join(path.split("\\")[:-1]),
                diffCallback=lambda x: emitDiffs(SESSIONS[sid]["REPO"], sid))

            return send_file(os.path.abspath(path))
        
        else:
            diffs, commits = SESSIONS[sid]["REPO"].getDiffForCommitPair(SESSIONS[sid]["COMMITS_PAIR"])

            if not diffs:
                return "Нет изменений"

            blob = None

            try:
                blob = commits[0].tree / diffs[SESSIONS[sid]["PAGE"]].a_path
            except:
                try:
                    blob = commits[1].tree / diffs[SESSIONS[sid]["PAGE"]].a_path
                except:
                    try:
                        blob = commits[1].tree / diffs[SESSIONS[sid]["PAGE"]].b_path
                    except:
                        blob = commits[0].tree / diffs[SESSIONS[sid]["PAGE"]].b_path

            
            with io.BytesIO(blob.data_stream.read()) as f:
                return f.read().decode()
    except:
        SESSIONS[sid]["STOP"] = True
        socketio.emit('eraseneeded', room=sid)
        return 'ok'

@app.route("/getlastfile", methods=['POST'])
def getlastfile():
    data = request.json
    sid = data['sid']

    return SESSIONS[sid]["CACHE"]["path"]

@app.route("/regetfile", methods=['POST'])
def regetfile():
    global SESSIONS

    data = request.json
    sid = data['sid']

    path = SESSIONS[sid]["CACHE"]["path"]

    if not(SESSIONS[sid]["REPO"]) or SESSIONS[sid]["REPO"].name != path.split("\\")[:-1]:
        SESSIONS[sid]["REPO"] = Repository('\\'.join(path.split("\\")[:-1]), diffCallback=lambda x: emitDiffs(SESSIONS[sid]["REPO"], sid))

    return send_file(os.path.abspath(path))

@app.route("/savefile", methods=['POST'])
def savefile():
    data = request.json
    path = data['path']

    with open(os.path.abspath(path), 'w') as f:
        f.write(data['data'])

    return 'ok'

class RepoEventHandler(FileSystemEventHandler):
    def __init__(self, repository):
        super().__init__()

        self.repository = repository

    def on_any_event(self, event):
        global SESSIONS

        if ".git" in event.src_path or SESSIONS[request.sid]["MODE"] != "LOCAL":
            return
        
        self.repository.updateDiffs()
        self.repository.diffCallback(self.repository)

class Repository:
    def __init__(self, name: str = None, url: str = None, diffCallback = None):
        if url:
            try:
                self.name = url
            except:
                pass
        
        self.name = name

        self.r = git.Repo(self.name)
        self.diffs = []

        self.observer = None
        self.diffCallback = diffCallback

        self.updateDiffs()
        self.addRepoObserver()

        self.cache = {}
    
    def updateDiffs(self):
        self.diffs = self.r.index.diff(None, create_patch=True, ignore_space_at_eol=True)
    
    def addRepoObserver(self):
        if self.observer:
            self.observer.stop()
        
        event_handler = RepoEventHandler(self)

        self.observer = Observer()
        self.observer.schedule(event_handler, self.name, recursive=True)
        self.observer.start()
    
    def getDiffbyFilename(self, filename):
        for d in self.diffs:
            if d.a_rawpath.decode('utf-8') == filename:
                return d
    
    def getFileFromGit(self, commit, filename):
        blob = commit.tree / filename
        
        with io.BytesIO(blob.data_stream.read()) as f:
            return f.read().decode(errors='ignore')

    def getDiffForCommitPair(self, pair=None, sid=None):
        global SESSIONS

        if sid:
            pair = SESSIONS[sid]["COMMITS_PAIR"]

        commit_TO = self.r.commit(pair["toDiff"] if pair["toDiff"] != "LOCAL" else None)
        commit_WITH = self.r.commit(pair["withDiff"] if pair["withDiff"] != "LOCAL" else None)

        diffs = commit_TO.diff(pair["withDiff"] if pair["withDiff"] != "LOCAL" else None, create_patch=True)

        self.cache[f'{pair["toDiff"]}_{pair["withDiff"]}'] = diffs
        return diffs, (commit_TO, commit_WITH)

    def getDiffForCommitPairUni(self, pair, page=1):
        global SESSIONS

        result_chunk = []
        
        diff = self.getDiffForCommitPair(pair)[0][page]


        added = False
        removed = False

        if not(diff.a_path):
            added = True
        if not(diff.b_path):
            removed = True

        a_path = "--- " + diff.a_path if diff.a_path else ""
        b_path = "+++ " + diff.b_path if diff.b_path else ""

        if added:
            sp = diff.diff.decode(errors='ignore').split("\n")
            h = {"Sstart": 1, "Slen": 0, "Tstart": 1, "Tlen": len(sp), "hunk": [], "type": SESSIONS[request.sid]["CURRENT_TYPE"], "full": True}
            
            for idx, i in enumerate(sp[1:-2]):
                h["hunk"].append({"index": idx, "value": i, "type": "+", 'name': b_path})
            
            h["Tlen"] = len(h["hunk"])

            result_chunk.append(h)

            return result_chunk

        if removed:
            sp = diff.diff.decode(errors='ignore').split("\n")
            h = {"Sstart": 1, "Slen": 0, "Tstart": 1, "Tlen": len(sp), "hunk": [], "type": SESSIONS[request.sid]["CURRENT_TYPE"], "full": True}
            
            for idx, i in enumerate(sp[1:-2]):
                h["hunk"].append({"index": idx, "value": i, "type": "-", 'name': a_path})
            
            h["Tlen"] = len(h["hunk"])

            result_chunk.append(h)

            return result_chunk

        patch = PatchSet(a_path + os.linesep + b_path + os.linesep + diff.diff.decode(errors='ignore'))
        for hunk in patch[0]:
            h = {"Sstart": hunk.source_start, "Slen": hunk.source_length, "Tstart": hunk.target_start, "Tlen": hunk.target_length, "hunk": [], "type": SESSIONS[request.sid]["CURRENT_TYPE"]}
            for l in hunk:
                    ind = l.target_line_no if l.target_line_no else l.source_line_no

                    if not ind:
                        continue

                    h["hunk"].append( {"index": ind, "value": l.value, "type": "+" if l.is_added else "-" if l.is_removed else ""} )

            result_chunk.append(h)

        return result_chunk
    
    def getDiffForCommitPairSplit(self, pair, page=1):
        global SESSIONS

        result_chunk = []
        diff = self.getDiffForCommitPair(pair)[0][page]

        added = False
        removed = False

        if not(diff.a_path):
            added = True
        if not(diff.b_path):
            removed = True

        a_path = "--- " + diff.a_path if diff.a_path else ""
        b_path = "+++ " + diff.b_path if diff.b_path else ""

        if added:
            sp = diff.diff.decode(errors='ignore').split("\n")
            h = {"Sstart": 1, "Slen": len(sp), "full": True, "added": True, "Tstart": 1, "Tlen": len(sp), "target": sp, "source": [], "type": SESSIONS[request.sid]["CURRENT_TYPE"]}

            result_chunk.append(h)

            return result_chunk

        if removed:
            sp = diff.diff.decode(errors='ignore').split("\n")
            h = {"Sstart": 1, "Slen": 1, "full": True, "removed": True, "Tstart": 1, "Tlen": len(sp), "target": [], "source": sp, "type": SESSIONS[request.sid]["CURRENT_TYPE"]}

            result_chunk.append(h)

            return result_chunk

        patch = PatchSet(a_path + os.linesep + b_path + os.linesep + diff.diff.decode(errors='ignore'))
        for hunk in patch[0]:

            h = {"Sstart": hunk.source_start, "Slen": hunk.source_length, "Tstart": hunk.target_start, "Tlen": hunk.target_length, "target": hunk.target, "source": hunk.source, "type": SESSIONS[request.sid]["CURRENT_TYPE"]}
            result_chunk.append(h)

        return result_chunk

    def getDiffForFileUni(self, d):
        global SESSIONS

        result_chunk = []

        a_path = "--- " + d.a_rawpath.decode('utf-8')
        b_path = "+++ " + d.b_rawpath.decode('utf-8')

        patch = PatchSet(a_path + os.linesep + b_path + os.linesep + d.diff.decode('utf-8', errors='ignore'))
        for hunk in patch[0]:
            h = {"Sstart": hunk.source_start, "Slen": hunk.source_length, "Tstart": hunk.target_start, "Tlen": hunk.target_length, "hunk": [], "type": SESSIONS[request.sid]["CURRENT_TYPE"]}
            for l in hunk:
                    ind = l.target_line_no if l.target_line_no else l.source_line_no

                    if not ind:
                        continue

                    h["hunk"].append( {"index": ind, "value": l.value, "type": "+" if l.is_added else "-" if l.is_removed else ""} )

            result_chunk.append(h)

        return result_chunk

    def getDiffForFileSplit(self, d):
        global SESSIONS

        result_chunk = []

        a_path = "--- " + d.a_rawpath.decode('utf-8')
        b_path = "+++ " + d.b_rawpath.decode('utf-8')

        patch = PatchSet(a_path + os.linesep + b_path + os.linesep + d.diff.decode('utf-8', errors='ignore'))
        for hunk in patch[0]:

            h = {"Sstart": hunk.source_start, "Slen": hunk.source_length, "Tstart": hunk.target_start, "Tlen": hunk.target_length, "target": hunk.target, "source": hunk.source, "type": SESSIONS[request.sid]["CURRENT_TYPE"]}
            result_chunk.append(h)

        return result_chunk

if __name__ == '__main__':
    socketio.run(app)