  function shadowCrawler(path) {
        let start = document;

        for (let step of path) {
          start = start.querySelector(step.selector);
          if (!start) return null;
          if (step.shadow) start = start.shadowRoot;
        }
        return start;
      }

export default shadowCrawler