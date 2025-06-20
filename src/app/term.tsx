import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { io } from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';

const InteractiveTerminal = () => {
  const terminalRef = useRef(null as any);
  const [socket, setSocket] = useState(null as any);
  const [terminal, setTerminal] = useState(null as any);
  const [systemInfo, setSystemInfo] = useState({
    user: '',
    hostname: '',
    cwd: ''
  });

  useEffect(() => {
    // Initialize xterm.js terminal
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(terminalRef.current);
    fitAddon.fit();
    
    setTerminal(term);

    // Initialize Socket.IO connection
    const newSocket = io();
    setSocket(newSocket);

    // Handle connection
    newSocket.on('connect', () => {
      term.writeln('\r\n*** Connected to server ***\r\n');
    });

    // Handle system info updates
    newSocket.on('systemInfo', (info) => {
      setSystemInfo(info);
    });

    // Handle terminal output from server
    newSocket.on('terminalOutput', (data) => {
      term.write(data);
    });

    // Handle terminal exit
    newSocket.on('terminalExit', ({ exitCode }) => {
      term.writeln(`\r\n*** Process exited with code ${exitCode} ***`);
    });

    // Send user input to server
    term.onData((data) => {
      newSocket.emit('terminalInput', data);
    });

    // Handle terminal resize
    const handleResize = () => {
      fitAddon.fit();
      newSocket.emit('resize', {
        cols: term.cols,
        rows: term.rows
      });
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      newSocket.close();
    };
  }, []);

  const getPromptDisplay = () => {
    if (!systemInfo.user || !systemInfo.hostname) return 'Terminal';
    return `${systemInfo.user}@${systemInfo.hostname}`;
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '10px', 
        background: '#2d2d2d', 
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '14px',
        borderBottom: '1px solid #444'
      }}>
        Connected as: {getPromptDisplay()}
      </div>
      
      <div 
        ref={terminalRef} 
        style={{ 
          flex: 1,
          padding: '10px'
        }}
      />
      
      <div style={{
        padding: '10px',
        background: '#2d2d2d',
        color: '#888',
        fontSize: '12px',
        textAlign: 'center'
      }}>
        Interactive terminal - supports nano, vim, and other interactive commands
      </div>
    </div>
  );
};

export default InteractiveTerminal;
