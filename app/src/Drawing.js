import React, { useState, useRef } from 'react';
import { Stage, Layer, Line } from 'react-konva';

const Drawing = props => {
  const [tool, setTool] = useState('pen');
  const [lines, setLines] = useState([]);
  const isDrawing = useRef(false);
  
  const handleMouseDown = e => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, { tool, points: [pos.x, pos.y] }]);
  };
  
  const handleMouseMove = e => {
    if (!isDrawing.current) {
      return;
    }
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastLine = lines[lines.length - 1];
  
    lastLine.points = lastLine.points.concat([point.x, point.y]);
  
    lines.splice(lines.length - 1, 1, lastLine);
    setLines(lines.concat());
  };
  
  const handleMouseUp = () => {
    isDrawing.current = false;
  };
  
  return (
    <div>
      <Stage
        width={500}
        height={300}
        onMouseDown={handleMouseDown}
        onMousemove={handleMouseMove}
        onMouseup={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        <Layer>
          {lines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
              stroke="#0a0a0a"
              strokeWidth={3}
              tension={0.5}
              lineCap="round"
              globalCompositeOperation={'source-over'}
            />
          ))}
        </Layer>
      </Stage>
      <button onClick={() => props.submit(lines)}>Envoyer</button>
    </div>
  );
}

export default Drawing;
