import React, { useState, useRef } from 'react';
import { Stage, Layer, Line, Circle } from 'react-konva';

const Drawing = props => {
  const [tool, setTool] = useState('pen');
  const [lines, setLines] = useState([]);
  const [circles, setCircles] = useState([]);
  const isDrawing = useRef(false);
  const stageRef = useRef(null);
  
  const handleMouseDown = e => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, { tool, points: [pos.x, pos.y] }]);
    setCircles([...circles, { x: pos.x, y: pos.y }]);
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

  const handleSubmit = () => {
    props.submit(stageRef.current.toDataURL());
  };
  
  return (
    <div>
      <div className="card">
        <Stage
          width={600}
          height={350}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          touchAction="none"
          style={{ touchAction: 'none' }}
          ref={stageRef}
        >
          <Layer>
            {lines.map((line, i) => (
              <Line
                key={`line${i}`}
                points={line.points}
                stroke="#0a0a0a"
                strokeWidth={3}
                tension={0.5}
                lineCap="round"
                globalCompositeOperation={'source-over'}
              />
            ))}
            {circles.map((circle, i) => (
              <Circle
                key={`circle${i}`}
                x={circle.x}
                y={circle.y}
                fill="0a0a0a"
                radius={2}
              />
            ))}
          </Layer>
        </Stage>
      </div>
      <button id="submitDessin" onClick={handleSubmit}>Envoyer</button>
    </div>
  );
}

export default Drawing;
