import React from "react";
import _ from "lodash";
import {DragDropMixin} from 'react-dnd';
import {DragItems, SCROLL_BAR_W} from "../../constants";
import Diaporama from "../../models/Diaporama";
import boundToStyle from "../../core/boundToStyle";
import Library from "../Library";
import Icon from "../Icon";
import TransitionCustomizer from "../TransitionCustomizer";
import ImageCustomizer from "../ImageCustomizer";
import SlideCustomizer from "../SlideCustomizer";
import GenerateScreen from "../GenerateScreen";
import ErrorScreen from "../ErrorScreen";
import AboutScreen from "../AboutScreen";
import Config from "../Config";
import TimelineElementInfo from "../TimelineElementInfo";

function step (a, b, x) {
  return Math.max(0, Math.min((x-a) / (b-a), 1));
}

var panels = {

  about: {
    accessible: () => true,
    icon: "info-circle",
    iconStyle: { position: "absolute", bottom: 5 },
    title: "About",
    render () {
      return <AboutScreen onDone={this.props.onNav.bind(null, "library")} />;
    }
  },

  error: {
    accessible: () => false,
    icon: "bug",
    title: "Error",
    render () {
      return <ErrorScreen error={this.props.error} />;
    }
  },

  config: {
    accessible: () => true,
    icon: "cogs",
    title: "Configuration",
    render (innerWidth, innerHeight) {
      const {
        diaporama,
        alterDiaporama,
        openTransitionPicker
      } = this.props;
      return <Config
        width={innerWidth}
        height={innerHeight}
        diaporama={diaporama}
        alterDiaporama={alterDiaporama}
        openTransitionPicker={openTransitionPicker}
      />;
    }
  },

  library: {
    accessible: () => true,
    icon: "folder-open",
    title: "Library",
    internalScroll: true,
    render: function (innerWidth, innerHeight) {
      const {
        diaporama,
        alterDiaporama
      } = this.props;
      return <Library
        width={innerWidth}
        height={innerHeight}
        usedImages={_.pluck(diaporama.timeline, "image")}
        alterDiaporama={alterDiaporama}
      />;
    }
  },

  generate: {
    accessible: () => true,
    icon: "download",
    title: "Save / Generate",
    render: function (innerWidth, innerHeight) {
      var diaporama = this.props.diaporama;
      return <GenerateScreen
        width={innerWidth}
        height={innerHeight}
        diaporama={diaporama}
      />;
    }
  },

  editSlide2d: {
    accessible(props) {
      const { selectedItemPointer, diaporama } = props;
      if (!selectedItemPointer || selectedItemPointer.transition) return false;
      const element = Diaporama.timelineForId(diaporama, selectedItemPointer.id);
      return !!element.slide2d;
    },
    icon: "newspaper-o",
    title: "Edit Slide",
    render (innerWidth, innerHeight) {
      const {
        selectedItemPointer,
        diaporama,
        alterSelection
      } = this.props;
      const element = Diaporama.timelineForId(diaporama, selectedItemPointer.id);
      if (!element) return <div>Slide Removed.</div>;
      return (
        <SlideCustomizer
          value={element.slide2d}
          key={selectedItemPointer.id}
          onChange={function (obj) {
            alterSelection("setItem", _.extend({}, element, { slide2d: obj }));
          }}
          width={innerWidth}
          height={innerHeight}
        />
      );
    }
  },

  editImage: {
    accessible(props) {
      const { selectedItemPointer, diaporama } = props;
      if (!selectedItemPointer || selectedItemPointer.transition) return false;
      const element = Diaporama.timelineForId(diaporama, selectedItemPointer.id);
      return !!element.image;
    },
    icon: "picture-o",
    title: "Edit Image",
    render (innerWidth) {
      const {
        selectedItemPointer,
        diaporama,
        alterSelection,
        time
      } = this.props;
      const element = Diaporama.timelineForId(diaporama, selectedItemPointer.id);
      const interval = Diaporama.timelineTimeIntervalForItemPointer(diaporama, selectedItemPointer);
      const progress = step(interval.start, interval.end, time);
      if (!element) return <div>Slide Removed.</div>;
      return <div style={{ paddingTop: '5px' }}>
        <ImageCustomizer
          value={element}
          onChange={alterSelection.bind(null, "setItem")}
          width={innerWidth}
          onRemove={alterSelection.bind(null, "removeItem")}
          progress={progress}
        />
        <TimelineElementInfo value={element} />
      </div>;
    }
  },

  editTransition: {
    accessible(props) {
      const { selectedItemPointer } = props;
      return selectedItemPointer && selectedItemPointer.transition;
    },
    icon: "magic",
    title: "Edit Transition",
    render (innerWidth) {
      const {
        selectedItemPointer,
        diaporama,
        time,
        alterSelection,
        openTransitionPicker
      } = this.props;
      const transitionInfos = Diaporama.timelineTransitionForId(diaporama, selectedItemPointer.id);
      const interval = Diaporama.timelineTimeIntervalForItemPointer(diaporama, selectedItemPointer);
      const progress = step(interval.start, interval.end, time);
      if (!transitionInfos || !transitionInfos.transitionNext) return <div>Transition Removed.</div>;
      return <div style={{ paddingTop: '5px' }}>
        <TransitionCustomizer
          value={transitionInfos.transitionNext}
          onChange={alterSelection.bind(null, "setItem")}
          width={innerWidth}
          images={[ DiaporamaMakerAPI.fromImage, DiaporamaMakerAPI.toImage ]}
          progress={progress}
          onRemove={alterSelection.bind(null, "removeItem")}
          openTransitionPicker={openTransitionPicker}
        />
      </div>;
    }
  }

};

var MainPanel = React.createClass({

  mixins: [DragDropMixin],

  statics: {
    configureDragDrop: function (register) {
      register(DragItems.SLIDE, {
        dropTarget: {
          getDropEffect: function () {
            return "move";
          },
          acceptDrop: function (component, itemPointer) {
            component.props.alterDiaporama("removeItem", itemPointer);
          }
        }
      });
    }
  },

  render () {
    const props = this.props;
    const {
      bound,
      mode,
      onNav
    } = props;
    const navWidth = 40;
    const innerWidth = bound.width - navWidth;
    const innerHeight = bound.height;

    const panel = panels[mode];
    const internalScroll = panel && panel.internalScroll;
    const panelDom =
      panel &&
      panel.render &&
      panel.render.call(this, innerWidth - (internalScroll ? 0 : SCROLL_BAR_W), innerHeight);

    const style = _.extend({
      borderTop: "1px solid #ccc",
      borderBottom: "1px solid #eee"
    }, boundToStyle(bound));

    const bodyStyle = _.extend({
      overflow: internalScroll ? "none" : "auto"
    }, boundToStyle({ x: navWidth, y: 0, width: innerWidth, height: innerHeight }));

    const navStyle = _.extend({
      padding: "8px",
      fontSize: "24px"
    }, boundToStyle({ x: 0, y: 0, width: navWidth, height: bound.height }));

    const navs = _.map(panels, function (panel, panelMode) {
      var selected = panelMode === mode;
      var onClick = panel.accessible(props) ? onNav.bind(null, panelMode) : undefined;
      if (!selected && !onClick) return undefined;
      const iconStyle = panel.iconStyle || {};
      return <Icon
        style={iconStyle}
        title={panel.title}
        key={panelMode}
        name={panel.icon}
        color={selected ? "#000" : "#999"}
        colorHover={selected ? "#000" : "#f90"}
        onClick={onClick}
      />;
    });

    return <div style={style}>
      <nav style={navStyle}>
        {navs}
      </nav>
      <div
      {...this.dropTargetFor(DragItems.SLIDE)}
      style={bodyStyle}>
      {panelDom}
      </div>
    </div>;
  }
});

module.exports = MainPanel;
