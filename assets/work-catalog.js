import BlogPostsList from '@theme/blog-posts-list';

/** Article case-study filtering shares the blog's cached hydration and reveal behavior. */
class WorkCatalog extends BlogPostsList {
  get filterSelector() { return '.work-catalog__filters'; }
  get resultsSelector() { return '.work-catalog__results'; }
  get paginationSelector() { return '.work-catalog__pagination'; }
  get cardSelector() { return '.work-card'; }
  get introSelector() { return '.work-catalog__intro > *'; }
}

if (!customElements.get('work-catalog-component')) {
  customElements.define('work-catalog-component', WorkCatalog);
}
