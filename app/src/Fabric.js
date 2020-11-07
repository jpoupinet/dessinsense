import React, { createContext, useState, useEffect } from 'react';
import { fabric } from 'fabric';

const FabricContext = createContext(null);

export { FabricContext };

export default function Fabric({ children }) {
  let fabricObject;

  const [canvas, setCanvas] = useState(false);
  const [objectList, setObjectList] = useState(['none']);

  const initCanvas = (c, options) => {
    setCanvas(new fabric.Canvas(c, options));
  };

  const penWidth = width => {
    const newCanvas = canvas;
    newCanvas.freeDrawingBrush.width = width;
    setCanvas(newCanvas);
  };

  useEffect(() => {
    if (!canvas) {
      return;
    }

    const handleEvent = e => {
      if (!e) {
        return;
      }
      setObjectList(canvas.getObjects());
    }

    handleEvent();

    canvas.on('object:added', handleEvent);
    canvas.on('object:removed', handleEvent);

    return () => {
      canvas.off('object:added');
    }
  }, [canvas]);

  fabricObject = {
    initCanvas,
    penWidth,
    canvas,
    objectList
  }

  return (
    <FabricContext.Provider value={fabricObject}>
      {children}
    </FabricContext.Provider>
  );
}