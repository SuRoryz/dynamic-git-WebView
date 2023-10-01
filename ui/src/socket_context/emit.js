import { socket } from "./sockets";

export const socketEvents = ({ setValue }) => {
  socket.on('queueLength', ({ queueLength }) => {
    setValue(state => { return { ...state, queueLength } });
  });
};